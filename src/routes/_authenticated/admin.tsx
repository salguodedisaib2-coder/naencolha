import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { ServiceChip } from "@/components/ServiceChip";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatBRL, type ServiceCategory } from "@/lib/categories";
import { createVoucher, revokeVoucher, listVouchersForVideo } from "@/lib/vouchers.functions";
import { toast } from "sonner";
import { Trash2, Upload, Ticket, Copy, MessageCircle } from "lucide-react";

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
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="videos">Conteúdos</TabsTrigger>
          <TabsTrigger value="finance">Financeiro</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab userId={userId} /></TabsContent>
        <TabsContent value="services"><ServicesTab userId={userId} /></TabsContent>
        <TabsContent value="photos"><PhotosTab userId={userId} /></TabsContent>
        <TabsContent value="videos"><VideosTab userId={userId} /></TabsContent>
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
    await supabase.from("free_photos").delete().eq("id", id);
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
          <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden group">
            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => del(p.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
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
    </div>
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
