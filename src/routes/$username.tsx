import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ServiceChip } from "@/components/ServiceChip";
import { Logo } from "@/components/Logo";
import { VideoCard } from "@/components/VideoCard";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatBRL,
  whatsappUrl,
  type ServiceCategory,
} from "@/lib/categories";
import { MessageCircle, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/$username")({
  component: ProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — NaEncolha` },
      {
        name: "description",
        content: `Conheça o perfil de @${params.username} no NaEncolha. Vídeos exclusivos via PIX.`,
      },
    ],
  }),
});

function ProfilePage() {
  const { username } = Route.useParams();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoPage, setVideoPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["creator", username],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, bio, cover_photo_url, avatar_url, whatsapp, is_active",
        )
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!profile) throw notFound();

      const [{ data: services }, { data: photos }, { data: videos }] = await Promise.all([
        supabase
          .from("creator_services")
          .select("service_id, services(id, label, category, sort_order)")
          .eq("creator_id", profile.id),
        supabase
          .from("free_photos")
          .select("id, photo_url, order_index")
          .eq("creator_id", profile.id)
          .order("order_index"),
        supabase
          .from("videos")
          .select("id, title, description, thumbnail_url, price_brl, video_url, is_free, resolution, duration_seconds, content_type")
          .eq("creator_id", profile.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      const packIds = (videos ?? []).filter((v: any) => v.content_type === "photo_pack").map((v: any) => v.id);
      const counts: Record<string, number> = {};
      if (packIds.length > 0) {
        const { data: pcs } = await supabase.from("pack_photos").select("video_id").in("video_id", packIds);
        for (const r of pcs ?? []) counts[r.video_id] = (counts[r.video_id] ?? 0) + 1;
      }

      return {
        profile,
        services: services ?? [],
        photos: photos ?? [],
        videos: (videos ?? []).map((v: any) => ({ ...v, photo_count: counts[v.id] ?? 0 })),
      };
    },
    retry: false,
  });

  const servicesByCategory = useMemo(() => {
    const map = new Map<ServiceCategory, { id: string; label: string; sort_order: number }[]>();
    data?.services.forEach((s: any) => {
      if (!s.services) return;
      const arr = map.get(s.services.category) ?? [];
      arr.push({ id: s.services.id, label: s.services.label, sort_order: s.services.sort_order });
      map.set(s.services.category, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [data]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            Esta criadora não existe ou está inativa.
          </p>
          <Link to="/" className="text-primary hover:underline">
            ← Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  const { profile, photos, videos } = data;
  const whatsapp = whatsappUrl(profile.whatsapp);
  const photoUrls = photos.map((p: any) => p.photo_url);

  const handleBuy = (video: { title: string; price_brl: number | string }) => {
    if (!profile.whatsapp) {
      toast.error("Esta criadora ainda não cadastrou WhatsApp.");
      return;
    }
    const url = whatsappUrl(profile.whatsapp);
    if (!url) {
      toast.error("WhatsApp inválido.");
      return;
    }
    const nome = profile.full_name || profile.username;
    const preco = formatBRL(Number(video.price_brl));
    const msg = `Oi ${nome}, gostaria de comprar via Pix o vídeo "${video.title}" no valor de ${preco}.`;
    const finalUrl = `${url}${url.includes("?") ? "&" : "?"}text=${encodeURIComponent(msg)}`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link to="/" aria-label="NaEncolha">
            <Logo className="h-10 md:h-12 w-auto" />
          </Link>
          <Link
            to="/$username/conteudos"
            params={{ username }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Conteúdos
          </Link>
        </div>
      </header>

      {/* Cover */}
      <div className="relative h-64 md:h-80 bg-muted overflow-hidden">
        {profile.cover_photo_url ? (
          <img src={profile.cover_photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-primary opacity-40" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Header */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background bg-card shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name || ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-primary" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{profile.full_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <Button className="bg-gradient-primary">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </a>
          )}
        </div>
        {profile.bio && (
          <p className="mt-4 text-foreground/90 max-w-3xl whitespace-pre-line">{profile.bio}</p>
        )}
      </div>

      {/* Services */}
      {servicesByCategory.size > 0 && (
        <section className="container mx-auto px-4 mt-12">
          <h2 className="text-2xl font-bold mb-6">Trabalhos que realiza</h2>
          <div className="space-y-5">
            {(() => {
              const rendered = new Set<ServiceCategory>();
              const blocks: ReactNode[] = [];
              const aparenciaCats = CATEGORY_ORDER.filter((c) =>
                c.startsWith("aparencia_"),
              );
              const hasAparencia = aparenciaCats.some(
                (c) => (servicesByCategory.get(c)?.length ?? 0) > 0,
              );

              CATEGORY_ORDER.forEach((cat) => {
                if (rendered.has(cat)) return;
                if (cat.startsWith("aparencia_")) {
                  if (!hasAparencia) return;
                  aparenciaCats.forEach((c) => rendered.add(c));
                  const allItems = aparenciaCats.flatMap(
                    (c) => servicesByCategory.get(c) ?? [],
                  );
                  blocks.push(
                    <div key="aparencia">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Aparência
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {allItems.map((s) => (
                          <ServiceChip key={s.id} label={s.label} active />
                        ))}
                      </div>
                    </div>,
                  );
                  return;
                }
                const items = servicesByCategory.get(cat);
                if (!items || items.length === 0) return;
                rendered.add(cat);
                blocks.push(
                  <div key={cat}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {CATEGORY_LABELS[cat]}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map((s) => (
                        <ServiceChip key={s.id} label={s.label} active />
                      ))}
                    </div>
                  </div>,
                );
              });
              return blocks;
            })()}
          </div>
        </section>
      )}

      {/* Free photos */}
      {photos.length > 0 && (
        <section className="container mx-auto px-4 mt-12">
          <h2 className="text-2xl font-bold mb-6">Galeria de fotos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((p: any, i: number) => (
              <button
                key={p.id}
                onClick={() => setLightboxIndex(i)}
                className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
              >
                <img src={p.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}

      <PhotoLightbox
        photos={photoUrls}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      {/* Videos */}
      {videos.length > 0 && (() => {
        const PAGE = 3;
        const totalPages = Math.ceil(videos.length / PAGE);
        const page = Math.min(videoPage, totalPages - 1);
        const start = page * PAGE;
        const visible = videos.slice(start, start + PAGE);
        const canPrev = page > 0;
        const canNext = page < totalPages - 1;
        return (
          <section id="conteudos-venda" className="container mx-auto px-4 mt-12 scroll-mt-24">
            <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
              <Link
                to="/$username/conteudos"
                params={{ username }}
                className="group inline-flex items-center gap-2"
              >
                <h2 className="text-2xl font-bold group-hover:text-primary transition">
                  Conteúdos à venda
                </h2>
                <ArrowRight className="w-5 h-5 text-primary opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                to="/$username/conteudos"
                params={{ username }}
                className="text-sm text-primary hover:underline"
              >
                Ver todos ({videos.length})
              </Link>
            </div>
            <div className="relative">
              {canPrev && (
                <button
                  type="button"
                  onClick={() => setVideoPage((p) => Math.max(0, p - 1))}
                  aria-label="Anteriores"
                  className="hidden md:grid place-items-center absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border hover:bg-accent shadow"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {canNext && (
                <button
                  type="button"
                  onClick={() => setVideoPage((p) => Math.min(totalPages - 1, p + 1))}
                  aria-label="Próximos"
                  className="hidden md:grid place-items-center absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border hover:bg-accent shadow"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((v: any) => (
                  <VideoCard
                    key={v.id}
                    id={v.id}
                    title={v.title}
                    description={v.description}
                    thumbnailUrl={v.thumbnail_url}
                    price={Number(v.price_brl)}
                    isFree={!!v.is_free}
                    resolution={v.resolution}
                    durationSeconds={v.duration_seconds}
                    contentType={v.content_type}
                    photoCount={v.photo_count}
                    onBuy={() => handleBuy(v)}
                  />
                ))}
              </div>
              {(canPrev || canNext) && (
                <div className="flex md:hidden justify-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setVideoPage((p) => Math.max(0, p - 1))}
                    disabled={!canPrev}
                    aria-label="Anteriores"
                    className="grid place-items-center w-10 h-10 rounded-full bg-card border border-border disabled:opacity-40"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-muted-foreground self-center px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVideoPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={!canNext}
                    aria-label="Próximos"
                    className="grid place-items-center w-10 h-10 rounded-full bg-card border border-border disabled:opacity-40"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {photos.length === 0 && videos.length === 0 && servicesByCategory.size === 0 && (
        <div className="container mx-auto px-4 mt-12 text-center py-20 text-muted-foreground">
          Esta criadora ainda não publicou conteúdo.
        </div>
      )}
    </div>
  );
}
