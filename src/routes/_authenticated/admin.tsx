import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteMyAccount } from "@/lib/account.functions";
import { useNavigate } from "@tanstack/react-router";
import { ServiceChip } from "@/components/ServiceChip";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatBRL, type ServiceCategory } from "@/lib/categories";
import { createVoucher, revokeVoucher, listVouchersForVideo, listAllVouchers, getVoucherStats, setVideoFeatured } from "@/lib/vouchers.functions";
import { toast } from "sonner";
import { Trash2, Upload, Ticket, Copy, MessageCircle, Flame, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RESOLUTION_OPTIONS = [
  { value: "480p", label: "480p (SD)" },
  { value: "720p", label: "720p (HD)" },
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "1440p", label: "1440p (2K)" },
  { value: "2160p", label: "2160p (4K)" },
  { value: "4320p", label: "4320p (8K)" },
];

function formatDuration(sec?: number | null) {
  if (!sec || sec <= 0) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel — NaEncolha" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Painel da criadora</h1>
      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="videos">Conteúdos</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="finance">Financeiro</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab userId={userId} /></TabsContent>
        <TabsContent value="services"><ServicesTab userId={userId} /></TabsContent>
        <TabsContent value="photos"><PhotosTab userId={userId} /></TabsContent>
        <TabsContent value="videos"><VideosTab userId={userId} /></TabsContent>
        <TabsContent value="vouchers"><VouchersTab /></TabsContent>
        <TabsContent value="finance"><FinanceTab userId={userId} /></TabsContent>
      </Tabs>
    </div>
  );
}

async function uploadFile(bucket: string, userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function ProfileTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ username: "", full_name: "", bio: "", whatsapp: "", is_active: false, avatar_url: "", cover_photo_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({
      username: profile.username ?? "",
      full_name: profile.full_name ?? "",
      bio: profile.bio ?? "",
      whatsapp: profile.whatsapp ?? "",
      is_active: profile.is_active,
      avatar_url: profile.avatar_url ?? "",
      cover_photo_url: profile.cover_photo_url ?? "",
    });
  }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        username: form.username.toLowerCase().trim() || null,
        full_name: form.full_name,
        bio: form.bio,
        whatsapp: form.whatsapp,
        is_active: form.is_active,
        avatar_url: form.avatar_url || null,
        cover_photo_url: form.cover_photo_url || null,
      }).eq("id", userId);
      if (error) throw error;
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (bucket: "avatars" | "covers", file: File) => {
    try {
      const url = await uploadFile(bucket, userId, file);
      setForm((f) => ({ ...f, [bucket === "avatars" ? "avatar_url" : "cover_photo_url"]: url }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Label>Foto de capa</Label>
        {form.cover_photo_url && <img src={form.cover_photo_url} alt="" className="mt-2 w-full h-40 object-cover rounded-lg" />}
        <Input type="file" accept="image/*" className="mt-2" onChange={(e) => e.target.files?.[0] && handleUpload("covers", e.target.files[0])} />
      </div>
      <div>
        <Label>Avatar</Label>
        {form.avatar_url && <img src={form.avatar_url} alt="" className="mt-2 w-24 h-24 object-cover rounded-full" />}
        <Input type="file" accept="image/*" className="mt-2" onChange={(e) => e.target.files?.[0] && handleUpload("avatars", e.target.files[0])} />
      </div>
      <div>
        <Label>Username (URL: /seunome)</Label>
        <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex: lara" />
      </div>
      <div>
        <Label>Nome de exibição</Label>
        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div>
        <Label>Bio</Label>
        <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
      </div>
      <div>
        <Label>WhatsApp (com DDD)</Label>
        <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="11999999999" />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        <Label>Perfil ativo (visível no site)</Label>
      </div>
      <Button onClick={save} disabled={saving} className="bg-gradient-primary">
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>

      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFn({});
      await supabase.auth.signOut();
      toast.success("Conta excluída permanentemente");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao excluir conta");
      setDeleting(false);
    }
  };

  return (
    <div className="mt-12 border-2 border-destructive/40 rounded-xl p-6 bg-destructive/5">
      <h3 className="text-xl font-bold text-destructive mb-2">Zona de perigo</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Excluir sua conta remove <strong>permanentemente</strong> seu perfil, todos os vídeos,
        todas as fotos, vouchers e histórico. Esta ação <strong>não pode ser desfeita</strong>.
      </p>
      <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(""); }}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="lg">
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir minha conta permanentemente
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-destructive">
              Excluir conta definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-base">
                <p>Esta ação irá <strong>apagar para sempre</strong>:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Seu perfil público e dados de cadastro</li>
                  <li>Todos os vídeos cadastrados e arquivos enviados</li>
                  <li>Todas as fotos do seu portfólio</li>
                  <li>Todos os vouchers emitidos</li>
                  <li>Seu acesso ao painel</li>
                </ul>
                <p className="text-destructive font-semibold">
                  Não há como recuperar nada depois disso.
                </p>
                <div className="pt-2">
                  <Label className="text-sm">
                    Para confirmar, digite <code className="bg-muted px-1 rounded">EXCLUIR</code> abaixo:
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="EXCLUIR"
                    className="mt-2"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "EXCLUIR" || deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Sim, excluir tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ServicesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").order("category").order("sort_order");
      return data ?? [];
    },
  });
  const { data: mine } = useQuery({
    queryKey: ["my-services", userId],
    queryFn: async () => {
      const { data } = await supabase.from("creator_services").select("service_id").eq("creator_id", userId);
      return new Set((data ?? []).map((r) => r.service_id));
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { if (mine) setSelected(new Set(mine)); }, [mine]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    try {
      await supabase.from("creator_services").delete().eq("creator_id", userId);
      if (selected.size > 0) {
        const rows = Array.from(selected).map((service_id) => ({ creator_id: userId, service_id }));
        const { error } = await supabase.from("creator_services").insert(rows);
        if (error) throw error;
      }
      toast.success("Serviços atualizados");
      qc.invalidateQueries({ queryKey: ["my-services"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!services) return <div>Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {CATEGORY_ORDER.map((cat) => {
        const items = services.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {CATEGORY_LABELS[cat as ServiceCategory]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {items.map((s) => (
                <ServiceChip key={s.id} label={s.label} active={selected.has(s.id)} onClick={() => toggle(s.id)} />
              ))}
            </div>
          </div>
        );
      })}
      <Button onClick={save} className="bg-gradient-primary">Salvar serviços</Button>
    </div>
  );
}

function PhotosTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: photos } = useQuery({
    queryKey: ["my-photos", userId],
    queryFn: async () => {
      const { data } = await supabase.from("free_photos").select("*").eq("creator_id", userId).order("order_index");
      return data ?? [];
    },
  });

  const handleUpload = async (files: FileList) => {
    try {
      const startIdx = photos?.length ?? 0;
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFile("free-photos", userId, files[i]);
        await supabase.from("free_photos").insert({ creator_id: userId, photo_url: url, order_index: startIdx + i });
      }
      toast.success(`${files.length} foto(s) enviadas`);
      qc.invalidateQueries({ queryKey: ["my-photos"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Remover esta foto? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("free_photos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Foto removida");
    qc.invalidateQueries({ queryKey: ["my-photos"] });
  };

  return (
    <div className="space-y-6">
      <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary">
        <Upload className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Clique para adicionar fotos</p>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos?.map((p) => (
          <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => del(p.id)}
              aria-label="Remover foto"
              className="absolute top-2 right-2 p-2 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {photos?.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-6">
            Nenhuma foto enviada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function VideosTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: videos } = useQuery({
    queryKey: ["my-videos", userId],
    queryFn: async () => {
      const { data } = await supabase.from("videos").select("*").eq("creator_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", video_url: "", thumbnail_url: "", is_free: false, resolution: "", duration_seconds: 0 });
  const [uploading, setUploading] = useState(false);
  const [thumbManual, setThumbManual] = useState(false);

  const reset = () => {
    setForm({ title: "", description: "", price: "", video_url: "", thumbnail_url: "", is_free: false, resolution: "", duration_seconds: 0 });
    setThumbManual(false);
    setAdding(false);
  };

  const extractBucketPath = (fileUrl: string, bucket: string) => {
    const directMarker = `/storage/v1/object/public/${bucket}/`;
    const signedMarker = `/storage/v1/object/sign/${bucket}/`;

    if (fileUrl.includes(directMarker)) {
      return fileUrl.split(directMarker)[1]?.split("?")[0] ?? "";
    }

    if (fileUrl.includes(signedMarker)) {
      return fileUrl.split(signedMarker)[1]?.split("?")[0] ?? "";
    }

    return "";
  };

  const persistThumbnail = async (videoId: string, thumbnailUrl: string) => {
    const { error } = await supabase
      .from("videos")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", videoId)
      .eq("creator_id", userId);

    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["my-videos"] });
  };

  const generateThumbnail = (source: File | string, randomize = false): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);
      video.src = objectUrl ?? (source as string);
      let finished = false;
      const timeout = window.setTimeout(() => {
        if (!finished) fail("Tempo esgotado ao gerar miniatura");
      }, 15000);

      const cleanup = () => {
        window.clearTimeout(timeout);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };

      const fail = (message: string) => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error(message));
      };

      const captureFrame = () => {
        if (finished) return;
        const canvas = document.createElement("canvas");
        const maxW = 640;
        const ratio = video.videoWidth ? maxW / video.videoWidth : 1;
        canvas.width = Math.round(video.videoWidth * ratio) || maxW;
        canvas.height = Math.round(video.videoHeight * ratio) || 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) return fail("Canvas indisponível");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (finished) return;
          finished = true;
          cleanup();
          if (blob) resolve(blob); else reject(new Error("Falha ao gerar miniatura"));
        }, "image/jpeg", 0.85);
      };

      video.onloadeddata = () => {
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        if (dur <= 0.2) {
          captureFrame();
          return;
        }

        const seekTo = randomize
          ? Math.max(0.1, Math.min(dur - 0.1, dur * (0.05 + Math.random() * 0.9)))
          : Math.min(1, Math.max(0.1, dur * 0.1));

        video.currentTime = seekTo;
      };

      video.onseeked = captureFrame;
      video.onerror = () => fail("Erro ao ler o vídeo");
      video.load();
    });
  };

  const generateThumbForExisting = async (v: any) => {
    setEditUploading(true);
    try {
      const path = extractBucketPath(v.video_url, "videos");
      let fetchUrl = v.video_url;

      if (path) {
        const { data, error } = await supabase.storage.from("videos").createSignedUrl(path, 120);
        if (error) throw error;
        fetchUrl = data.signedUrl;
      }

      const blob = await generateThumbnail(fetchUrl, true);
      const thumbFile = new File([blob], `auto-${Date.now()}.jpg`, { type: "image/jpeg" });
      const thumbUrl = await uploadFile("thumbnails", userId, thumbFile);
      await persistThumbnail(v.id, thumbUrl);
      setEditForm((f) => ({ ...f, thumbnail_url: thumbUrl }));
      toast.success("Miniatura gerada e salva");
    } catch (e: any) {
      toast.error("Não foi possível gerar: " + e.message);
    } finally {
      setEditUploading(false);
    }
  };



  const readVideoDuration = (file: File): Promise<number> => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    const done = (d: number) => { URL.revokeObjectURL(url); resolve(d); };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0);
    v.onerror = () => done(0);
    setTimeout(() => done(0), 8000);
  });

  const handleFile = async (kind: "video" | "thumb", file: File) => {
    setUploading(true);
    try {
      if (kind === "video") {
        const [url, dur] = await Promise.all([
          uploadFile("videos", userId, file),
          readVideoDuration(file),
        ]);
        let thumbUrl = "";
        if (!thumbManual) {
          try {
            const blob = await generateThumbnail(file);
            const thumbFile = new File([blob], `auto-${Date.now()}.jpg`, { type: "image/jpeg" });
            thumbUrl = await uploadFile("thumbnails", userId, thumbFile);
          } catch (err) {
            console.warn("Auto-thumbnail falhou:", err);
          }
        }
        setForm((f) => ({ ...f, video_url: url, thumbnail_url: thumbUrl || f.thumbnail_url, duration_seconds: Math.round(dur) }));
        toast.success(thumbUrl ? "Vídeo enviado (miniatura gerada)" : "Vídeo enviado");
      } else {
        const url = await uploadFile("thumbnails", userId, file);
        setForm((f) => ({ ...f, thumbnail_url: url }));
        setThumbManual(true);
        toast.success("Miniatura enviada");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    try {
      const { error } = await supabase.from("videos").insert({
        creator_id: userId,
        title: form.title,
        description: form.description,
        price_brl: form.is_free ? 0 : Number(form.price),
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url || null,
        is_free: form.is_free,
        resolution: form.resolution || null,
        duration_seconds: form.duration_seconds || null,
      });
      if (error) throw error;
      toast.success("Conteúdo cadastrado");
      reset();
      qc.invalidateQueries({ queryKey: ["my-videos"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("videos").update({ is_active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-videos"] });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir conteúdo?")) return;
    await supabase.from("videos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-videos"] });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: "", thumbnail_url: "", is_free: false, resolution: "" });
  const [editUploading, setEditUploading] = useState(false);
  const [voucherVideo, setVoucherVideo] = useState<{ id: string; title: string; price: number } | null>(null);

  const profileQ = useQuery({
    queryKey: ["my-profile-min", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("whatsapp, username").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const startEdit = (v: any) => {
    setEditingId(v.id);
    setEditForm({
      title: v.title ?? "",
      description: v.description ?? "",
      price: String(v.price_brl ?? ""),
      thumbnail_url: v.thumbnail_url ?? "",
      is_free: !!v.is_free,
      resolution: v.resolution ?? "",
    });
  };
  const handleEditThumb = async (file: File) => {
    setEditUploading(true);
    try {
      const url = await uploadFile("thumbnails", userId, file);
      if (editingId) {
        await persistThumbnail(editingId, url);
      }
      setEditForm((f) => ({ ...f, thumbnail_url: url }));
      toast.success("Miniatura enviada e salva");
    } catch (e: any) { toast.error(e.message); }
    finally { setEditUploading(false); }
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("videos").update({
      title: editForm.title,
      description: editForm.description,
      price_brl: editForm.is_free ? 0 : Number(editForm.price),
      thumbnail_url: editForm.thumbnail_url || null,
      is_free: editForm.is_free,
      resolution: editForm.resolution || null,
    }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Conteúdo atualizado");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["my-videos"] });
  };

  return (
    <div className="space-y-6">
      {!adding ? (
        <Button onClick={() => setAdding(true)} className="bg-gradient-primary">+ Adicionar conteúdo</Button>
      ) : (
        <div className="border border-border rounded-xl p-6 space-y-4 max-w-2xl">
          <h3 className="font-semibold">Novo conteúdo</h3>
          <div>
            <Label>Arquivo de vídeo</Label>
            <Input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFile("video", e.target.files[0])} />
            {form.video_url && (
              <p className="text-xs text-primary mt-1">
                ✓ Enviado{form.duration_seconds ? ` · duração ${formatDuration(form.duration_seconds)}` : ""}
              </p>
            )}
          </div>
          <div>
            <Label>Miniatura (opcional — gerada automaticamente do vídeo se vazia)</Label>
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile("thumb", e.target.files[0])} />
            {form.thumbnail_url && (
              <div className="mt-2 flex items-center gap-3">
                <img src={form.thumbnail_url} alt="miniatura" className="w-24 h-16 object-cover rounded" />
                <p className="text-xs text-primary">✓ {thumbManual ? "Enviada" : "Gerada automaticamente"}</p>
              </div>
            )}
          </div>
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Resolução do vídeo (opcional)</Label>
            <Select value={form.resolution || "none"} onValueChange={(v) => setForm({ ...form, resolution: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Não informar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informar</SelectItem>
                {RESOLUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 py-1">
            <Checkbox id="is_free" checked={form.is_free} onCheckedChange={(c) => setForm({ ...form, is_free: !!c, price: c ? "0" : form.price })} />
            <Label htmlFor="is_free" className="cursor-pointer font-normal">Vídeo gratuito (para divulgação) — qualquer pessoa pode assistir</Label>
          </div>
          {!form.is_free && (
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          )}
          <div className="flex gap-2">
            <Button onClick={save} disabled={uploading || !form.video_url || !form.title || (!form.is_free && !form.price)} className="bg-gradient-primary">{uploading ? "Enviando..." : "Salvar"}</Button>
            <Button variant="ghost" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      )}
      <div className="grid gap-4">
        {videos?.map((v) => editingId === v.id ? (
          <div key={v.id} className="border border-primary rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                {editForm.thumbnail_url ? (
                  <img src={editForm.thumbnail_url} alt="" className="w-32 h-20 object-cover rounded" />
                ) : (
                  <div className="w-32 h-20 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">sem miniatura</div>
                )}
                <label className="text-xs text-primary cursor-pointer hover:underline">
                  {editUploading ? "Processando..." : "Enviar miniatura"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleEditThumb(e.target.files[0])} />
                </label>
                <button type="button" disabled={editUploading} onClick={() => generateThumbForExisting(v)} className="text-xs text-muted-foreground hover:text-primary hover:underline disabled:opacity-50">
                  Gerar do vídeo
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div><Label>Título</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                <div>
                  <Label>Resolução (opcional)</Label>
                  <Select value={editForm.resolution || "none"} onValueChange={(val) => setEditForm({ ...editForm, resolution: val === "none" ? "" : val })}>
                    <SelectTrigger><SelectValue placeholder="Não informar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informar</SelectItem>
                      {RESOLUTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <Checkbox id={`edit_free_${editingId}`} checked={editForm.is_free} onCheckedChange={(c) => setEditForm({ ...editForm, is_free: !!c, price: c ? "0" : editForm.price })} />
                  <Label htmlFor={`edit_free_${editingId}`} className="cursor-pointer font-normal">Vídeo gratuito</Label>
                </div>
                {!editForm.is_free && (
                  <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></div>
                )}
                <div className="flex gap-2">
                  <Button onClick={saveEdit} disabled={editUploading} className="bg-gradient-primary">Salvar</Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </div>
              </div>
            </div>
          </div>

        ) : (
          <div key={v.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:border-primary transition-colors cursor-pointer" onClick={() => startEdit(v)}>
            {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-24 h-16 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold truncate">{v.title}</p>
                {v.is_free && <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Grátis</span>}
                {v.resolution && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{v.resolution}</span>}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">{v.description || "Sem descrição — clique para editar"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {v.is_free ? "Gratuito" : formatBRL(Number(v.price_brl))} · {v.purchase_count} vendas
                {v.duration_seconds ? ` · ${formatDuration(v.duration_seconds)}` : ""}
              </p>
            </div>
            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
              {!v.is_free && (
                <Button variant="outline" size="sm" onClick={() => setVoucherVideo({ id: v.id, title: v.title, price: Number(v.price_brl) })}>
                  <Ticket className="w-4 h-4 mr-1" /> Vouchers
                </Button>
              )}
              <Switch checked={v.is_active} onCheckedChange={(c) => toggleActive(v.id, c)} />
              <Button variant="ghost" size="icon" onClick={() => del(v.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      {voucherVideo && (
        <VoucherDialog
          video={voucherVideo}
          whatsapp={profileQ.data?.whatsapp ?? null}
          username={profileQ.data?.username ?? null}
          onClose={() => setVoucherVideo(null)}
        />
      )}
    </div>
  );
}

function VoucherDialog({
  video,
  whatsapp,
  username,
  onClose,
}: {
  video: { id: string; title: string; price: number };
  whatsapp: string | null;
  username: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createVoucher);
  const revoke = useServerFn(revokeVoucher);
  const list = useServerFn(listVouchersForVideo);

  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState(String(video.price ?? ""));
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const { data: vouchers, refetch } = useQuery({
    queryKey: ["vouchers", video.id],
    queryFn: () => list({ data: { videoId: video.id } }),
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await create({
        data: {
          videoId: video.id,
          customerLabel: customer.trim() || undefined,
          amountPaid: amount ? Number(amount) : undefined,
        },
      });
      setLastCreated(res.code);
      setCustomer("");
      toast.success("Voucher gerado!");
      refetch();
      qc.invalidateQueries({ queryKey: ["vouchers", video.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revogar este voucher? O cliente não conseguirá mais assistir.")) return;
    try {
      await revoke({ data: { voucherId: id } });
      toast.success("Voucher revogado");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copiado!"),
      () => toast.error("Não foi possível copiar"),
    );
  };

  const buildVoucherUrl = (code: string) => {
    if (typeof window === "undefined") return `/voucher/${code}`;
    return `${window.location.origin}/voucher/${code}`;
  };

  const sendWhatsApp = (code: string) => {
    if (!whatsapp) {
      toast.error("Cadastre seu WhatsApp no perfil primeiro.");
      return;
    }
    const digits = whatsapp.replace(/\D/g, "");
    const full = digits.startsWith("55") ? digits : `55${digits}`;
    const url = buildVoucherUrl(code);
    const msg = `Aqui está seu voucher do vídeo "${video.title}":\n\nCódigo: ${code}\nAcesse: ${url}\n\nÉ só clicar no link ou digitar o código no site para assistir e baixar.`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vouchers — {video.title}</DialogTitle>
          <DialogDescription>
            Gere um voucher após confirmar o pagamento via PIX. Envie o código pelo WhatsApp e o cliente poderá assistir e baixar o vídeo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div>
              <Label>Quem comprou (opcional)</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome ou telefone do cliente" />
            </div>
            <div>
              <Label>Valor recebido (R$, opcional)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full bg-gradient-primary">
              <Ticket className="w-4 h-4 mr-2" />
              {creating ? "Gerando..." : "Gerar voucher"}
            </Button>
          </div>

          {lastCreated && (
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Voucher gerado</p>
              <p className="text-3xl font-mono font-bold tracking-wider text-primary mb-3">{lastCreated}</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => copy(lastCreated)}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copiar código
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy(buildVoucherUrl(lastCreated))}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copiar link
                </Button>
                <Button size="sm" className="bg-gradient-primary" onClick={() => sendWhatsApp(lastCreated)}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-2">Vouchers emitidos ({vouchers?.vouchers.length ?? 0})</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {vouchers?.vouchers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum voucher emitido ainda.</p>
              )}
              {vouchers?.vouchers.map((v: any) => (
                <div key={v.id} className={`border rounded-lg p-3 ${v.is_active ? "border-border" : "border-border opacity-60"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-bold text-primary">{v.code}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {v.customer_label || "Sem identificação"}
                        {v.amount_paid != null && ` · ${formatBRL(Number(v.amount_paid))}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {v.is_active ? "Ativo" : "Revogado"} · usado {v.use_count}x
                        {v.last_used_at && ` · último: ${new Date(v.last_used_at).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => copy(v.code)} title="Copiar código">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      {v.is_active && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => sendWhatsApp(v.code)} title="Enviar no WhatsApp">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRevoke(v.id)} title="Revogar">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FinanceTab({ userId }: { userId: string }) {
  const { data: purchases } = useQuery({
    queryKey: ["my-purchases", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("id, amount_paid, paid_at, created_at, videos(title), customers(name)")
        .eq("creator_id", userId)
        .eq("status", "paid")
        .order("paid_at", { ascending: false });
      return data ?? [];
    },
  });

  const total = (purchases ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-gradient-primary text-primary-foreground">
        <p className="text-sm opacity-90">Total recebido</p>
        <p className="text-3xl font-bold">{formatBRL(total)}</p>
      </div>
      {purchases && purchases.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          {purchases.map((p: any) => (
            <div key={p.id} className="flex justify-between p-4 border-b border-border last:border-0">
              <div>
                <p className="font-medium">{p.videos?.title}</p>
                <p className="text-sm text-muted-foreground">{p.customers?.name} · {new Date(p.paid_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <p className="font-semibold text-primary">{formatBRL(Number(p.amount_paid))}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-12 text-muted-foreground">Nenhuma venda registrada ainda.</p>
      )}
    </div>
  );
}

type Period = "today" | "7d" | "month" | "all";

function periodRange(p: Period): { from?: string; to?: string } {
  const now = new Date();
  if (p === "all") return {};
  if (p === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    return { from: d.toISOString() };
  }
  if (p === "7d") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { from: d.toISOString() };
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: d.toISOString() };
}

function VouchersTab() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("month");
  const [search, setSearch] = useState("");
  const [videoFilter, setVideoFilter] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "active" | "revoked">("all");

  const fetchList = useServerFn(listAllVouchers);
  const fetchStats = useServerFn(getVoucherStats);
  const doRevoke = useServerFn(revokeVoucher);
  const doFeature = useServerFn(setVideoFeatured);

  const range = useMemo(() => periodRange(period), [period]);

  const { data: listData } = useQuery({
    queryKey: ["all-vouchers", period, search, videoFilter, status],
    queryFn: () => fetchList({
      data: {
        ...range,
        videoId: videoFilter === "all" ? undefined : videoFilter,
        status,
        search: search.trim() || undefined,
      },
    }),
  });
  const { data: statsData } = useQuery({
    queryKey: ["voucher-stats", period],
    queryFn: () => fetchStats({ data: range }),
  });

  const { data: myVideos } = useQuery({
    queryKey: ["my-videos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, is_featured")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const featuredMap = useMemo(() => {
    const m = new Map<string, boolean>();
    (myVideos ?? []).forEach((v: any) => m.set(v.id, !!v.is_featured));
    return m;
  }, [myVideos]);

  const handleRevoke = async (id: string) => {
    if (!confirm("Revogar este voucher? O cliente perderá o acesso.")) return;
    try {
      await doRevoke({ data: { voucherId: id } });
      toast.success("Voucher revogado");
      queryClient.invalidateQueries({ queryKey: ["all-vouchers"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFeature = async (videoId: string, featured: boolean) => {
    try {
      await doFeature({ data: { videoId, featured } });
      toast.success(featured ? "Adicionado aos Mais Vendidos" : "Removido dos Mais Vendidos");
      queryClient.invalidateQueries({ queryKey: ["my-videos-list"] });
      queryClient.invalidateQueries({ queryKey: ["featured-videos"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const vouchers = listData?.vouchers ?? [];
  const stats = statsData ?? { count: 0, revenue: 0, topVideos: [] as Array<{ videoId: string; title: string; count: number; revenue: number }> };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Vouchers emitidos</p>
          <p className="text-3xl font-bold mt-1">{stats.count}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Receita total</p>
          <p className="text-3xl font-bold mt-1 text-primary">{formatBRL(stats.revenue)}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Vídeo mais vendido</p>
          <p className="text-base font-semibold mt-1 line-clamp-2">
            {stats.topVideos[0]?.title ?? "—"}
          </p>
          {stats.topVideos[0] && (
            <p className="text-xs text-muted-foreground mt-1">{stats.topVideos[0].count} vendas</p>
          )}
        </div>
      </div>

      {/* Ranking */}
      {stats.topVideos.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Top 5 do período
          </h3>
          <div className="space-y-2">
            {stats.topVideos.map((v, i) => {
              const isFeat = featuredMap.get(v.videoId) ?? false;
              return (
                <div key={v.videoId} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-muted-foreground font-mono">{i + 1}º</span>
                  <span className="flex-1 truncate">{v.title}</span>
                  <span className="text-muted-foreground">{v.count} venda(s) · {formatBRL(v.revenue)}</span>
                  <Button
                    size="sm"
                    variant={isFeat ? "default" : "outline"}
                    onClick={() => handleFeature(v.videoId, !isFeat)}
                  >
                    <Flame className="w-3.5 h-3.5 mr-1" />
                    {isFeat ? "Em destaque" : "Destacar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={videoFilter} onValueChange={setVideoFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Vídeo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os vídeos</SelectItem>
            {(myVideos ?? []).map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="revoked">Revogados</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar código ou comprador"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 max-w-sm"
        />
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Vídeo</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum voucher no período.
                </TableCell>
              </TableRow>
            ) : vouchers.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono font-semibold">{v.code}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="flex items-center gap-2">
                    {v.videos?.thumbnail_url && (
                      <img src={v.videos.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                    <span className="truncate">{v.videos?.title ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell>{v.customer_label ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{v.amount_paid != null ? formatBRL(Number(v.amount_paid)) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-xs">
                  {v.use_count}
                  {v.last_used_at && (
                    <div className="text-muted-foreground">
                      últ: {new Date(v.last_used_at).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {v.is_active ? (
                    <span className="text-xs px-2 py-1 rounded bg-primary/15 text-primary">Ativo</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">Revogado</span>
                  )}
                </TableCell>
                <TableCell>
                  {v.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => handleRevoke(v.id)}>
                      Revogar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
