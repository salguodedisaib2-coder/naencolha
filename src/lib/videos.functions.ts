import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function extractVideosPath(url: string) {
  const direct = "/storage/v1/object/public/videos/";
  const signed = "/storage/v1/object/sign/videos/";
  if (url.includes(direct)) return url.split(direct)[1]?.split("?")[0] ?? "";
  if (url.includes(signed)) return url.split(signed)[1]?.split("?")[0] ?? "";
  return "";
}

export const getFreeVideoUrl = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("videos")
      .select("id, is_free, is_active, video_url")
      .eq("id", data.videoId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row || !row.is_active || !row.is_free) {
      throw new Error("Vídeo indisponível");
    }

    const path = extractVideosPath(row.video_url);
    if (!path) throw new Error("Caminho do vídeo inválido");

    const { data: signed, error: signErr } = await supabaseAdmin
      .storage.from("videos")
      .createSignedUrl(path, 60 * 60);

    if (signErr || !signed) throw new Error(signErr?.message ?? "Falha ao assinar URL");
    return { url: signed.signedUrl };
  });
