import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { VideoCard } from "@/components/VideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, whatsappUrl } from "@/lib/categories";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/$username/conteudos")({
  component: CreatorVideosPage,
  head: ({ params }) => ({
    meta: [
      { title: `Conteúdos de @${params.username} — NaEncolha` },
      {
        name: "description",
        content: `Todos os vídeos à venda de @${params.username}. Pagamento via PIX e entrega imediata.`,
      },
    ],
  }),
});

function CreatorVideosPage() {
  const { username } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["creator-videos", username],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, whatsapp, is_active")
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!profile) throw notFound();

      const { data: videos } = await supabase
        .from("videos")
        .select(
          "id, title, description, thumbnail_url, price_brl, video_url, is_free, resolution, duration_seconds, content_type",
        )
        .eq("creator_id", profile.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const packIds = (videos ?? []).filter((v: any) => v.content_type === "photo_pack").map((v: any) => v.id);
      let counts: Record<string, number> = {};
      if (packIds.length > 0) {
        const { data: pcs } = await supabase
          .from("pack_photos")
          .select("video_id")
          .in("video_id", packIds);
        for (const r of pcs ?? []) counts[r.video_id] = (counts[r.video_id] ?? 0) + 1;
      }

      return { profile, videos: (videos ?? []).map((v: any) => ({ ...v, photo_count: counts[v.id] ?? 0 })) };
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Criadora não encontrada</h1>
          <Link to="/" className="text-primary hover:underline">
            ← Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  const { profile, videos } = data;

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
    const tipo = (video as any).content_type === "photo_pack" ? "o pack de fotos" : "o vídeo";
    const msg = `Oi ${nome}, gostaria de comprar via Pix ${tipo} "${video.title}" no valor de ${preco}.`;
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
            to="/$username"
            params={{ username }}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao perfil
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1">
          Conteúdos de {profile.full_name || `@${profile.username}`}
        </h1>
        <p className="text-muted-foreground mb-8">
          {videos.length} {videos.length === 1 ? "vídeo disponível" : "vídeos disponíveis"}
        </p>

        {videos.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            Esta criadora ainda não publicou vídeos.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((v: any) => (
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
        )}
      </section>
    </div>
  );
}
