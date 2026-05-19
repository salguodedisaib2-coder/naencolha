import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ServiceChip } from "@/components/ServiceChip";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatBRL, type ServiceCategory } from "@/lib/categories";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

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
  const [form, setForm] = useState({ title: "", description: "", price: "", video_url: "", thumbnail_url: "" });
  const [uploading, setUploading] = useState(false);
  const [thumbManual, setThumbManual] = useState(false);

  const reset = () => {
    setForm({ title: "", description: "", price: "", video_url: "", thumbnail_url: "" });
    setThumbManual(false);
    setAdding(false);
  };

  const generateThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      const url = URL.createObjectURL(file);
      video.src = url;
      const cleanup = () => URL.revokeObjectURL(url);
      video.onloadedmetadata = () => {
        // Seek a bit in to avoid black first frame
        const seekTo = Math.min(1, (video.duration || 2) * 0.1);
        video.currentTime = seekTo;
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        const maxW = 640;
        const ratio = video.videoWidth ? maxW / video.videoWidth : 1;
        canvas.width = Math.round(video.videoWidth * ratio) || maxW;
        canvas.height = Math.round(video.videoHeight * ratio) || 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); return reject(new Error("Canvas indisponível")); }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          cleanup();
          if (blob) resolve(blob); else reject(new Error("Falha ao gerar miniatura"));
        }, "image/jpeg", 0.85);
      };
      video.onerror = () => { cleanup(); reject(new Error("Erro ao ler o vídeo")); };
    });
  };

  const handleFile = async (kind: "video" | "thumb", file: File) => {
    setUploading(true);
    try {
      if (kind === "video") {
        const url = await uploadFile("videos", userId, file);
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
        setForm((f) => ({ ...f, video_url: url, thumbnail_url: thumbUrl || f.thumbnail_url }));
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
        price_brl: Number(form.price),
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url || null,
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

  return (
    <div className="space-y-6">
      {!adding ? (
        <Button onClick={() => setAdding(true)} className="bg-gradient-primary">+ Adicionar conteúdo</Button>
      ) : (
        <div className="border border-border rounded-xl p-6 space-y-4 max-w-2xl">
          <h3 className="font-semibold">Novo conteúdo</h3>
          <div><Label>Arquivo de vídeo</Label><Input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFile("video", e.target.files[0])} />{form.video_url && <p className="text-xs text-primary mt-1">✓ Enviado</p>}</div>
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
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={uploading || !form.video_url || !form.title || !form.price} className="bg-gradient-primary">{uploading ? "Enviando..." : "Salvar"}</Button>
            <Button variant="ghost" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      )}
      <div className="grid gap-4">
        {videos?.map((v) => (
          <div key={v.id} className="flex items-center gap-4 p-4 border border-border rounded-xl">
            {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-24 h-16 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{v.title}</p>
              <p className="text-sm text-muted-foreground">{formatBRL(Number(v.price_brl))} · {v.purchase_count} vendas</p>
            </div>
            <Switch checked={v.is_active} onCheckedChange={(c) => toggleActive(v.id, c)} />
            <Button variant="ghost" size="icon" onClick={() => del(v.id)}><Trash2 className="w-4 h-4" /></Button>
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
