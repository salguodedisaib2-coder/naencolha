import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Trash2, Shield, ShieldOff, Images, Play, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/categories";
import {
  listAllCreatorsAdmin,
  getCreatorContentAdmin,
  setCreatorActive,
  deleteCreatorAdmin,
  createVideoUploadUrlAdmin,
  finalizeVideoReplaceAdmin,
} from "@/lib/superadmin.functions";
import { ensureH264 } from "@/lib/transcode-h265";

export const Route = createFileRoute("/_authenticated/superadmin")({
  head: () => ({ meta: [{ title: "Super Admin — NaEncolha" }] }),
  component: SuperAdmin,
});

function SuperAdmin() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setAuthorized(false);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      setAuthorized(!!roles);
    });
  }, []);

  if (authorized === null) return <div className="p-8 text-center">Verificando...</div>;
  if (!authorized) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Acesso negado</h1>
        <p className="text-muted-foreground mb-4">Apenas super admins têm acesso a esta área.</p>
        <Link to="/admin" className="text-primary hover:underline">Ir para meu painel</Link>
      </div>
    );
  }

  return <SuperAdminContent />;
}

function SuperAdminContent() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllCreatorsAdmin);
  const blockFn = useServerFn(setCreatorActive);
  const deleteFn = useServerFn(deleteCreatorAdmin);

  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sa-creators"],
    queryFn: () => listFn(),
  });

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("purchases").select("amount_paid").eq("status", "paid");
      const total = (data ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
      return { totalSales: total, totalPurchases: data?.length ?? 0 };
    },
  });

  const creators = data?.creators ?? [];
  const filtered = creators.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.username ?? "").toLowerCase().includes(q) || (c.full_name ?? "").toLowerCase().includes(q);
  });

  const totalViews = creators.reduce((s: number, c: any) => s + (c.views ?? 0), 0);

  const handleBlock = async (id: string, isActive: boolean) => {
    try {
      await blockFn({ data: { creatorId: id, isActive } });
      toast.success(isActive ? "Página desbloqueada" : "Página bloqueada");
      qc.invalidateQueries({ queryKey: ["sa-creators"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteFn({ data: { creatorId: deleting.id } });
      toast.success("Criadora excluída permanentemente");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["sa-creators"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao excluir");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold">Super Admin</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Criadoras" value={creators.length} />
        <StatCard label="Visualizações" value={totalViews} />
        <StatCard label="Vendas" value={stats?.totalPurchases ?? 0} />
        <StatCard label="Receita total" value={formatBRL(stats?.totalSales ?? 0)} highlight />
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar criadora..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando criadoras...</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-4">Criadora</div>
            <div className="col-span-2 text-center">Visualizações</div>
            <div className="col-span-2 text-center">Conteúdos</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>
          {filtered.map((c: any) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 border-t border-border">
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted" />
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.full_name || "(sem nome)"}</p>
                  <p className="text-xs text-muted-foreground truncate">@{c.username ?? "—"} · id {c.id.slice(0, 8)}</p>
                </div>
              </div>
              <div className="col-span-2 text-center">
                <span className="inline-flex items-center gap-1 text-sm font-semibold">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  {c.views}
                </span>
              </div>
              <div className="col-span-2 text-center text-xs text-muted-foreground">
                <div className="flex flex-col">
                  <span>{c.video_count} vídeos · {c.video_pack_count ?? 0} packs vídeo</span>
                  <span>{c.pack_count} packs foto · {c.free_photo_count} fotos</span>
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-center gap-2">
                <Switch
                  checked={c.is_active}
                  onCheckedChange={(v) => handleBlock(c.id, v)}
                  aria-label="bloquear / desbloquear"
                />
                {c.is_active ? (
                  <span className="text-xs text-primary font-semibold">Ativa</span>
                ) : (
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <ShieldOff className="w-3 h-3" /> Bloqueada
                  </span>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewing({ id: c.id, name: c.full_name || c.username || "criadora" })}>
                  <Eye className="w-4 h-4 mr-1" /> Conteúdo
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleting({ id: c.id, name: c.full_name || c.username || "criadora" })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhuma criadora encontrada.</p>
          )}
        </div>
      )}

      {viewing && (
        <ContentReviewDialog
          creatorId={viewing.id}
          creatorName={viewing.name}
          onClose={() => setViewing(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir criadora?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação <strong>não pode ser desfeita</strong>. Todos os dados de{" "}
              <strong>{deleting?.name}</strong> (perfil, vídeos, fotos, packs, vouchers, vendas e arquivos) serão apagados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, excluir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-xl border ${highlight ? "bg-gradient-primary text-primary-foreground border-transparent" : "bg-card border-border"}`}>
      <p className={`text-xs uppercase tracking-wide ${highlight ? "opacity-90" : "text-muted-foreground"}`}>{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

async function downloadFromUrl(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("falha ao baixar");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (e: any) {
    toast.error(e?.message ?? "Falha ao baixar");
  }
}

function safeName(s: string) {
  return s.replace(/[^\w\-]+/g, "_").slice(0, 60) || "arquivo";
}

function ContentReviewDialog({ creatorId, creatorName, onClose }: { creatorId: string; creatorName: string; onClose: () => void }) {
  const getContent = useServerFn(getCreatorContentAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["sa-content", creatorId],
    queryFn: () => getContent({ data: { creatorId } }),
  });

  const videos = (data?.videos ?? []).filter((v: any) => v.content_type === "video");
  const packs = (data?.videos ?? []).filter((v: any) => v.content_type === "photo_pack");
  const videoPacks = (data?.videos ?? []).filter((v: any) => v.content_type === "video_pack");
  const packPhotosByVideo: Record<string, any[]> = {};
  for (const p of data?.pack_photos ?? []) {
    (packPhotosByVideo[p.video_id] ??= []).push(p);
  }
  const packVideosByVideo: Record<string, any[]> = {};
  for (const pv of data?.pack_videos ?? []) {
    (packVideosByVideo[pv.video_id] ??= []).push(pv);
  }
  const freePhotos = data?.free_photos ?? [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conteúdo de {creatorName}</DialogTitle>
          <DialogDescription>
            Visualização administrativa — acesso completo para averiguação. Vídeos pagos abrem com URL assinada temporária.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Carregando conteúdo...</p>
        ) : (
          <Tabs defaultValue="videos">
            <TabsList>
              <TabsTrigger value="videos"><Play className="w-3.5 h-3.5 mr-1" /> Vídeos ({videos.length})</TabsTrigger>
              <TabsTrigger value="packs"><Images className="w-3.5 h-3.5 mr-1" /> Packs foto ({packs.length})</TabsTrigger>
              <TabsTrigger value="video-packs"><Play className="w-3.5 h-3.5 mr-1" /> Packs vídeo ({videoPacks.length})</TabsTrigger>
              <TabsTrigger value="free">Fotos grátis ({freePhotos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="space-y-4 mt-4">
              {videos.length === 0 && <p className="text-sm text-muted-foreground">Sem vídeos.</p>}
              {videos.map((v: any) => (
                <VideoReviewRow key={v.id} v={v} creatorId={creatorId} />
              ))}
            </TabsContent>

            <TabsContent value="packs" className="space-y-4 mt-4">
              {packs.length === 0 && <p className="text-sm text-muted-foreground">Sem packs.</p>}
              {packs.map((p: any) => {
                const photos = packPhotosByVideo[p.id] ?? [];
                return (
                  <div key={p.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h4 className="font-semibold">{p.title}</h4>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">{photos.length} fotos</span>
                      {!p.is_active && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">Inativo</span>}
                      <span className="text-xs text-muted-foreground ml-auto">{p.is_free ? "Gratuito" : formatBRL(Number(p.price_brl))}</span>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {photos.map((ph: any, i: number) => (
                        <div key={ph.id} className={`relative aspect-square rounded overflow-hidden border group ${ph.is_cover ? "border-primary" : "border-border"}`}>
                          <img src={ph.photo_url} alt="" className="w-full h-full object-cover" />
                          {ph.is_cover && (
                            <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold py-0.5 rounded bg-primary text-primary-foreground text-center">CAPA</span>
                          )}
                          <button
                            type="button"
                            onClick={() => downloadFromUrl(ph.photo_url, `${safeName(p.title)}_${i + 1}.jpg`)}
                            className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition"
                            aria-label="Baixar foto"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="free" className="mt-4">
              {freePhotos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem fotos grátis.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {freePhotos.map((ph: any, i: number) => (
                    <div key={ph.id} className="relative aspect-square rounded overflow-hidden border border-border group">
                      <img src={ph.photo_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => downloadFromUrl(ph.photo_url, `${safeName(creatorName)}_foto_${i + 1}.jpg`)}
                        className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition"
                        aria-label="Baixar foto"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VideoReviewRow({ v, creatorId }: { v: any; creatorId: string }) {
  const qc = useQueryClient();
  const createUrlFn = useServerFn(createVideoUploadUrlAdmin);
  const finalizeFn = useServerFn(finalizeVideoReplaceAdmin);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("");

  const handleConvert = async () => {
    if (!v.signed_url) return toast.error("Sem URL do vídeo");
    setConverting(true);
    setProgress(0);
    setPhase("Baixando...");
    try {
      const res = await fetch(v.signed_url);
      if (!res.ok) throw new Error("Falha ao baixar vídeo");
      const blob = await res.blob();
      const file = new File([blob], `${safeName(v.title)}.mp4`, { type: blob.type || "video/mp4" });

      setPhase("Analisando codec...");
      const converted = await ensureH264(file, (r) => {
        setPhase("Convertendo...");
        setProgress(Math.round(r * 100));
      });

      if (converted === file) {
        toast.info("Vídeo já está em H.264 — nada a converter.");
        setConverting(false);
        return;
      }

      setPhase("Enviando...");
      setProgress(0);
      const { path, token } = await createUrlFn({ data: { creatorId } });
      const { error: upErr } = await supabase.storage
        .from("videos")
        .uploadToSignedUrl(path, token, converted, { contentType: "video/mp4" });
      if (upErr) throw new Error(upErr.message);

      setPhase("Finalizando...");
      await finalizeFn({ data: { videoId: v.id, newPath: path } });
      toast.success("Vídeo convertido para H.264");
      qc.invalidateQueries({ queryKey: ["sa-content", creatorId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na conversão");
    } finally {
      setConverting(false);
      setPhase("");
      setProgress(0);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start gap-4">
        {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-40 h-24 object-cover rounded" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold truncate">{v.title}</h4>
            {v.is_free && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Grátis</span>}
            {!v.is_active && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">Inativo</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{v.description || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">{v.is_free ? "Gratuito" : formatBRL(Number(v.price_brl))}</p>
          {v.signed_url && (
            <>
              <video src={v.signed_url} controls className="mt-3 w-full max-w-xl rounded" />
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadFromUrl(v.signed_url, `${safeName(v.title)}.mp4`)}
                  disabled={converting}
                >
                  <Download className="w-4 h-4 mr-1" /> Baixar vídeo
                </Button>
                <Button size="sm" variant="outline" onClick={handleConvert} disabled={converting}>
                  {converting ? `${phase} ${progress ? progress + "%" : ""}` : "Converter para H.264"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
