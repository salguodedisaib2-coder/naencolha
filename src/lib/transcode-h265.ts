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
 * Detects video codec from file logs. Returns lowercase codec name (e.g. "hevc", "h264") or null.
 */
async function detectCodec(file: File): Promise<string | null> {
  const ff = await getFFmpeg();
  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => logs.push(message);
  ff.on("log", onLog);
  try {
    const inputName = `probe_${Date.now()}.bin`;
    await ff.writeFile(inputName, await fetchFile(file));
    // Run a no-op to get stream info printed to logs
    await ff.exec(["-i", inputName, "-f", "null", "-"]).catch(() => 0);
    await ff.deleteFile(inputName).catch(() => {});
    const joined = logs.join("\n");
    const m = joined.match(/Stream #\d+:\d+.*?Video:\s*([a-zA-Z0-9_]+)/);
    return m ? m[1].toLowerCase() : null;
  } finally {
    ff.off("log", onLog);
  }
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
    return new File([data], newName, { type: "video/mp4" });
  } finally {
    ff.off("progress", onProg);
  }
}
