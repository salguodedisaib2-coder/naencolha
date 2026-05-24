import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const ff = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ff;
    return ff;
  })();
  return loadPromise;
}

/**
 * Fast codec sniffing by scanning the first chunk of an MP4/MOV container for
 * the sample-description fourcc (avc1, hvc1, hev1, vp09, av01...). Avoids
 * loading the entire file into ffmpeg.wasm just to read metadata.
 * Returns lowercase codec name ("hevc", "h264", ...) or null.
 */
async function detectCodec(file: File): Promise<string | null> {
  // Read up to 8MB from the start — moov is usually within the first few MB
  // (and faststart files have it right after ftyp).
  const sliceSize = Math.min(file.size, 8 * 1024 * 1024);
  const head = new Uint8Array(await file.slice(0, sliceSize).arrayBuffer());
  const ascii = (i: number) =>
    String.fromCharCode(head[i], head[i + 1], head[i + 2], head[i + 3]);

  const codecs: Record<string, string> = {
    hvc1: "hevc",
    hev1: "hevc",
    hvcC: "hevc",
    avc1: "h264",
    avc3: "h264",
    avcC: "h264",
    vp09: "vp9",
    av01: "av1",
  };

  for (let i = 0; i < head.length - 4; i++) {
    const tag = ascii(i);
    if (codecs[tag]) return codecs[tag];
  }
  return null;
}

/**
 * If the input video is H.265/HEVC, transcodes to H.264 (MP4) in-browser.
 * Returns the original file otherwise.
 */
export async function ensureH264(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<File> {
  if (!file.type.startsWith("video/") && !/\.(mp4|mov|mkv|webm|m4v|hevc)$/i.test(file.name)) {
    return file;
  }
  let codec: string | null = null;
  try {
    codec = await detectCodec(file);
  } catch (e) {
    console.warn("Falha ao detectar codec, mantendo arquivo original:", e);
    return file;
  }
  if (!codec) return file;
  const isH265 = codec === "hevc" || codec === "h265";
  if (!isH265) return file;

  const ff = await getFFmpeg();
  const inputName = `in_${Date.now()}.mp4`;
  const outputName = `out_${Date.now()}.mp4`;
  const onProg = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, progress)));
  };
  ff.on("progress", onProg);
  try {
    await ff.writeFile(inputName, await fetchFile(file));
    await ff.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputName,
    ]);
    const data = (await ff.readFile(outputName)) as Uint8Array;
    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(outputName).catch(() => {});
    const newName = file.name.replace(/\.[^.]+$/, "") + "_h264.mp4";
    const buf = new Uint8Array(data).buffer;
    return new File([buf], newName, { type: "video/mp4" });
  } finally {
    ff.off("progress", onProg);
  }
}
