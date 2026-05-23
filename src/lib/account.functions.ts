import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Deletes the authenticated creator's account: removes storage files,
// database rows in dependent tables, the profile and the auth user.
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    if (!userId) throw new Error("Não autenticado");

    // Helper: list and remove all files in a bucket under the user's folder.
    const wipeBucket = async (bucket: string) => {
      const { data: files, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(userId, { limit: 1000 });
      if (error) return; // bucket may not exist or be empty
      if (!files || files.length === 0) return;
      const paths = files.map((f) => `${userId}/${f.name}`);
      await supabaseAdmin.storage.from(bucket).remove(paths);
    };

    // 1. Storage cleanup (best effort)
    await Promise.all([
      wipeBucket("videos"),
      wipeBucket("thumbnails"),
      wipeBucket("free-photos"),
      wipeBucket("covers"),
      wipeBucket("avatars"),
    ]);

    // 2. Database rows
    await supabaseAdmin.from("video_vouchers").delete().eq("creator_id", userId);
    await supabaseAdmin.from("purchases").delete().eq("creator_id", userId);
    await supabaseAdmin.from("videos").delete().eq("creator_id", userId);
    await supabaseAdmin.from("free_photos").delete().eq("creator_id", userId);
    await supabaseAdmin.from("creator_services").delete().eq("creator_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 3. Auth user (last)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw new Error(`Falha ao excluir conta: ${authErr.message}`);

    return { ok: true };
  });
