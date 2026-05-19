import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ServiceChip } from "@/components/ServiceChip";
import { VideoCard } from "@/components/VideoCard";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  whatsappUrl,
  type ServiceCategory,
} from "@/lib/categories";
import { MessageCircle } from "lucide-react";
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
          .select("id, title, description, thumbnail_url, price_brl")
          .eq("creator_id", profile.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      return { profile, services: services ?? [], photos: photos ?? [], videos: videos ?? [] };
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

  const handleBuy = () => {
    toast.info("Pagamento via PIX em breve!", {
      description: "Integração com gateway será adicionada no próximo ciclo.",
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">
            NaEncolha
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
            {CATEGORY_ORDER.map((cat) => {
              const items = servicesByCategory.get(cat);
              if (!items || items.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((s) => (
                      <ServiceChip key={s.id} label={s.label} active />
                    ))}
                  </div>
                </div>
              );
            })}
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
      {videos.length > 0 && (
        <section className="container mx-auto px-4 mt-12">
          <h2 className="text-2xl font-bold mb-6">Vídeos à venda</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((v: any) => (
              <VideoCard
                key={v.id}
                title={v.title}
                description={v.description}
                thumbnailUrl={v.thumbnail_url}
                price={Number(v.price_brl)}
                onBuy={handleBuy}
              />
            ))}
          </div>
        </section>
      )}

      {photos.length === 0 && videos.length === 0 && servicesByCategory.size === 0 && (
        <div className="container mx-auto px-4 mt-12 text-center py-20 text-muted-foreground">
          Esta criadora ainda não publicou conteúdo.
        </div>
      )}
    </div>
  );
}
