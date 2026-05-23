import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(prefix: string) {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  const cleanPrefix = (prefix || "VID").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
  return `${cleanPrefix}-${s}`;
}

function extractVideosPath(url: string) {
  const direct = "/storage/v1/object/public/videos/";
  const signed = "/storage/v1/object/sign/videos/";
  if (url.includes(direct)) return url.split(direct)[1]?.split("?")[0] ?? "";
  if (url.includes(signed)) return url.split(signed)[1]?.split("?")[0] ?? "";
  return "";
}

export const createVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    videoId: z.string().uuid(),
    customerLabel: z.string().trim().max(120).optional(),
    amountPaid: z.number().nonnegative().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // validate video belongs to user
    const { data: video, error: vErr } = await supabaseAdmin
      .from("videos")
      .select("id, creator_id, title")
      .eq("id", data.videoId)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!video || video.creator_id !== userId) throw new Error("Vídeo não encontrado");

    // fetch username for code prefix
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    const prefix = profile?.username ?? "VID";

    // generate unique code (retry on collision)
    let code = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = randomCode(prefix);
      const { data: existing } = await supabaseAdmin
        .from("video_vouchers")
        .select("id")
        .eq("code", candidate)
        .maybeSingle();
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Falha ao gerar código único, tente novamente");

    const { data: voucher, error } = await supabaseAdmin
      .from("video_vouchers")
      .insert({
        video_id: data.videoId,
        creator_id: userId,
        code,
        customer_label: data.customerLabel || null,
        amount_paid: data.amountPaid ?? null,
      })
      .select("id, code")
      .single();
    if (error) throw new Error(error.message);

    return { id: voucher.id, code: voucher.code, videoTitle: video.title };
  });

export const revokeVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ voucherId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("video_vouchers")
      .update({ is_active: false })
      .eq("id", data.voucherId)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const redeemVoucher = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    code: z.string().trim().min(4).max(40),
  }).parse(input))
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase().trim();

    const { data: voucher, error } = await supabaseAdmin
      .from("video_vouchers")
      .select("id, video_id, creator_id, is_active")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!voucher) throw new Error("Voucher inválido. Confirme o código com a acompanhante.");
    if (!voucher.is_active) throw new Error("Este voucher foi revogado. Entre em contato com a acompanhante.");

    const { data: video, error: vErr } = await supabaseAdmin
      .from("videos")
      .select("id, title, description, thumbnail_url, video_url, is_active, resolution, duration_seconds")
      .eq("id", voucher.video_id)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!video || !video.is_active) throw new Error("Este vídeo não está mais disponível.");

    const { data: creator } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", voucher.creator_id)
      .maybeSingle();

    const path = extractVideosPath(video.video_url);
    if (!path) throw new Error("Caminho do vídeo inválido");

    const [streamRes, downloadRes] = await Promise.all([
      supabaseAdmin.storage.from("videos").createSignedUrl(path, 60 * 60),
      supabaseAdmin.storage.from("videos").createSignedUrl(path, 60 * 60, { download: true }),
    ]);

    if (streamRes.error || !streamRes.data) throw new Error(streamRes.error?.message ?? "Falha ao gerar URL");
    if (downloadRes.error || !downloadRes.data) throw new Error(downloadRes.error?.message ?? "Falha ao gerar URL de download");

    // record usage (best-effort)
    const { data: current } = await supabaseAdmin
      .from("video_vouchers")
      .select("use_count")
      .eq("id", voucher.id)
      .maybeSingle();
    await supabaseAdmin
      .from("video_vouchers")
      .update({
        last_used_at: new Date().toISOString(),
        use_count: (current?.use_count ?? 0) + 1,
      })
      .eq("id", voucher.id);

    return {
      streamUrl: streamRes.data.signedUrl,
      downloadUrl: downloadRes.data.signedUrl,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnail_url,
        resolution: video.resolution,
        durationSeconds: video.duration_seconds,
      },
      creator: {
        username: creator?.username ?? null,
        fullName: creator?.full_name ?? null,
        avatarUrl: creator?.avatar_url ?? null,
      },
    };
  });

export const listVouchersForVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("video_vouchers")
      .select("id, code, customer_label, amount_paid, is_active, created_at, last_used_at, use_count")
      .eq("video_id", data.videoId)
      .eq("creator_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { vouchers: rows ?? [] };
  });

export const listAllVouchers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    videoId: z.string().uuid().optional(),
    status: z.enum(["all", "active", "revoked"]).optional(),
    search: z.string().trim().max(120).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    let q = supabaseAdmin
      .from("video_vouchers")
      .select("id, code, customer_label, amount_paid, is_active, created_at, last_used_at, use_count, video_id, videos(id, title, thumbnail_url)")
      .eq("creator_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.videoId) q = q.eq("video_id", data.videoId);
    if (data.status === "active") q = q.eq("is_active", true);
    if (data.status === "revoked") q = q.eq("is_active", false);
    if (data.search) {
      const s = data.search.trim();
      q = q.or(`code.ilike.%${s}%,customer_label.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { vouchers: rows ?? [] };
  });

export const getVoucherStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    let q = supabaseAdmin
      .from("video_vouchers")
      .select("amount_paid, video_id, videos(id, title)")
      .eq("creator_id", context.userId);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    const count = list.length;
    const revenue = list.reduce((acc: number, r: any) => acc + (Number(r.amount_paid) || 0), 0);
    const byVideo = new Map<string, { videoId: string; title: string; count: number; revenue: number }>();
    for (const r of list as any[]) {
      const vid = r.video_id;
      const title = r.videos?.title ?? "(vídeo removido)";
      const cur = byVideo.get(vid) ?? { videoId: vid, title, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(r.amount_paid) || 0;
      byVideo.set(vid, cur);
    }
    const topVideos = Array.from(byVideo.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    return { count, revenue, topVideos };
  });

export const setVideoFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    videoId: z.string().uuid(),
    featured: z.boolean(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ is_featured: data.featured })
      .eq("id", data.videoId)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
