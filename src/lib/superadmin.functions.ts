import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

async function assertSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

// Public — record a page view for a profile
export const recordPageView = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ profileId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.from("page_views").insert({ profile_id: data.profileId });
    return { ok: true };
  });

// Super admin — list creators with view counts and content counts
export const listAllCreatorsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId!);
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, is_active, created_at, whatsapp, avatar_url")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return { creators: [] };

    const [viewsRes, videosRes, packsRes, freePhotosRes] = await Promise.all([
      supabaseAdmin.from("page_views").select("profile_id").in("profile_id", ids),
      supabaseAdmin.from("videos").select("creator_id, content_type").in("creator_id", ids),
      supabaseAdmin.from("pack_photos").select("creator_id").in("creator_id", ids),
      supabaseAdmin.from("free_photos").select("creator_id").in("creator_id", ids),
    ]);

    const views: Record<string, number> = {};
    for (const r of viewsRes.data ?? []) views[r.profile_id] = (views[r.profile_id] ?? 0) + 1;
    const videoCount: Record<string, number> = {};
    const packCount: Record<string, number> = {};
    for (const r of videosRes.data ?? []) {
      if (r.content_type === "photo_pack") packCount[r.creator_id] = (packCount[r.creator_id] ?? 0) + 1;
      else videoCount[r.creator_id] = (videoCount[r.creator_id] ?? 0) + 1;
    }
    const photoCount: Record<string, number> = {};
    for (const r of packsRes.data ?? []) photoCount[r.creator_id] = (photoCount[r.creator_id] ?? 0) + 1;
    const freePhotoCount: Record<string, number> = {};
    for (const r of freePhotosRes.data ?? []) freePhotoCount[r.creator_id] = (freePhotoCount[r.creator_id] ?? 0) + 1;

    return {
      creators: (profiles ?? []).map((p) => ({
        ...p,
        views: views[p.id] ?? 0,
        video_count: videoCount[p.id] ?? 0,
        pack_count: packCount[p.id] ?? 0,
        pack_photo_count: photoCount[p.id] ?? 0,
        free_photo_count: freePhotoCount[p.id] ?? 0,
      })),
    };
  });

// Super admin — load all content for one creator (for review)
export const getCreatorContentAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ creatorId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId!);
    const [{ data: videos }, { data: freePhotos }, { data: packPhotos }] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select("id, title, description, thumbnail_url, video_url, price_brl, is_free, is_active, content_type, created_at")
        .eq("creator_id", data.creatorId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("free_photos")
        .select("id, photo_url, order_index")
        .eq("creator_id", data.creatorId)
        .order("order_index"),
      supabaseAdmin
        .from("pack_photos")
        .select("id, video_id, photo_url, order_index, is_cover")
        .eq("creator_id", data.creatorId)
        .order("order_index"),
    ]);

    // Generate signed URLs for private videos
    const videosWithSigned = await Promise.all(
      (videos ?? []).map(async (v) => {
        if (v.content_type !== "video" || !v.video_url) return { ...v, signed_url: null };
        const marker = "/storage/v1/object/public/videos/";
        const signedMarker = "/storage/v1/object/sign/videos/";
        let path = "";
        if (v.video_url.includes(marker)) path = v.video_url.split(marker)[1].split("?")[0];
        else if (v.video_url.includes(signedMarker)) path = v.video_url.split(signedMarker)[1].split("?")[0];
        if (!path) return { ...v, signed_url: null };
        const { data: s } = await supabaseAdmin.storage.from("videos").createSignedUrl(path, 60 * 30);
        return { ...v, signed_url: s?.signedUrl ?? null };
      }),
    );

    return {
      videos: videosWithSigned,
      free_photos: freePhotos ?? [],
      pack_photos: packPhotos ?? [],
    };
  });

// Super admin — block / unblock a creator (sets is_active)
export const setCreatorActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ creatorId: z.string().uuid(), isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId!);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.isActive })
      .eq("id", data.creatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Super admin — permanently delete a creator (storage + db rows + auth user)
export const deleteCreatorAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ creatorId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId!);
    const creatorId = data.creatorId;

    const wipeBucket = async (bucket: string) => {
      const { data: files, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(creatorId, { limit: 1000 });
      if (error || !files || files.length === 0) return;
      const paths = files.map((f) => `${creatorId}/${f.name}`);
      await supabaseAdmin.storage.from(bucket).remove(paths);
    };

    await Promise.all([
      wipeBucket("videos"),
      wipeBucket("thumbnails"),
      wipeBucket("free-photos"),
      wipeBucket("covers"),
      wipeBucket("avatars"),
    ]);

    await supabaseAdmin.from("page_views").delete().eq("profile_id", creatorId);
    await supabaseAdmin.from("video_vouchers").delete().eq("creator_id", creatorId);
    await supabaseAdmin.from("purchases").delete().eq("creator_id", creatorId);
    await supabaseAdmin.from("pack_photos").delete().eq("creator_id", creatorId);
    await supabaseAdmin.from("videos").delete().eq("creator_id", creatorId);
    await supabaseAdmin.from("free_photos").delete().eq("creator_id", creatorId);
    await supabaseAdmin.from("creator_services").delete().eq("creator_id", creatorId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", creatorId);
    await supabaseAdmin.from("profiles").delete().eq("id", creatorId);

    await supabaseAdmin.auth.admin.deleteUser(creatorId);
    return { ok: true };
  });

// One-time seed: create the test super admin user.
// Idempotent — safe to call multiple times.
export const seedTestSuperAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const email = "naencolha@teste.com";
  const password = "Biasi@002";

  // Try to find existing user
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find((u) => u.email === email) ?? null;

  if (!user) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Super Admin (teste)" },
    });
    if (error) throw new Error(error.message);
    user = created.user;
  }

  if (!user) throw new Error("Falha ao criar usuário");

  // Ensure super_admin role
  const { data: existingRole } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();

  if (!existingRole) {
    await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: "super_admin" });
  }

  return { ok: true, userId: user.id, email };
});

// Super admin — create a signed upload URL for replacing a video file
export const createVideoUploadUrlAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ creatorId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId!);
    const newPath = `${data.creatorId}/h264_${Date.now()}.mp4`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("videos")
      .createSignedUploadUrl(newPath);
    if (error || !signed) throw new Error(error?.message ?? "Falha ao criar URL de upload");
    return { path: newPath, token: signed.token };
  });

// Super admin — finalize replacement: update DB row, remove old file
export const finalizeVideoReplaceAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      videoId: z.string().uuid(),
      newPath: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId!);
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("videos")
      .select("video_url")
      .eq("id", data.videoId)
      .maybeSingle();
    if (fetchErr || !row) throw new Error(fetchErr?.message ?? "Vídeo não encontrado");

    const marker = "/storage/v1/object/public/videos/";
    const signedMarker = "/storage/v1/object/sign/videos/";
    let oldPath = "";
    const u = row.video_url ?? "";
    if (u.includes(marker)) oldPath = u.split(marker)[1].split("?")[0];
    else if (u.includes(signedMarker)) oldPath = u.split(signedMarker)[1].split("?")[0];

    const { data: pub } = supabaseAdmin.storage.from("videos").getPublicUrl(data.newPath);
    const { error: updErr } = await supabaseAdmin
      .from("videos")
      .update({ video_url: pub.publicUrl })
      .eq("id", data.videoId);
    if (updErr) throw new Error(updErr.message);

    if (oldPath && oldPath !== data.newPath) {
      await supabaseAdmin.storage.from("videos").remove([oldPath]).catch(() => {});
    }
    return { ok: true };
  });
