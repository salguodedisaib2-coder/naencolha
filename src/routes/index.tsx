import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreatorCard } from "@/components/CreatorCard";
import { Logo } from "@/components/Logo";
import { ServiceChip } from "@/components/ServiceChip";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, CATEGORY_ORDER, type ServiceCategory } from "@/lib/categories";
import { Search, Flame, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NaEncolha — Encontre criadoras verificadas" },
      {
        name: "description",
        content:
          "Plataforma de criadoras adultas. Navegue pelo catálogo, descubra perfis e adquira conteúdo exclusivo via PIX.",
      },
    ],
  }),
  component: HomePage,
});

type Creator = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  videos: { count: number }[];
  creator_services: { service_id: string }[];
};

function HomePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [featuredPage, setFeaturedPage] = useState(0);

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: creators, isLoading } = useQuery({
    queryKey: ["creators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, cover_photo_url, videos(count), creator_services(service_id)",
        )
        .eq("is_active", true)
        .not("username", "is", null);
      if (error) throw error;
      return data as Creator[];
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, price_brl, is_free, content_type, creator_id, profiles!inner(username, full_name, is_active)")
        .eq("is_featured", true)
        .eq("is_active", true)
        .eq("profiles.is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as any[];
    },
  });


  const filtered = useMemo(() => {
    if (!creators) return [];
    return creators.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          c.username?.toLowerCase().includes(q) || c.full_name?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (activeServices.size > 0) {
        const ids = new Set(c.creator_services.map((s) => s.service_id));
        for (const id of activeServices) if (!ids.has(id)) return false;
      }
      return true;
    });
  }, [creators, search, activeServices]);

  const servicesByCategory = useMemo(() => {
    const map = new Map<ServiceCategory, typeof services>();
    services?.forEach((s) => {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    });
    return map;
  }, [services]);

  const toggleService = (id: string) => {
    setActiveServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/" aria-label="NaEncolha">
            <Logo className="h-10 md:h-12 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/conteudos"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Conteúdos
            </Link>
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Área da criadora
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Conteúdo exclusivo,{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">direto da fonte</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A plataforma onde criadoras vendem seus vídeos com pagamento via PIX e entrega imediata.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar criadora por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 bg-card border-border"
            />
          </div>
        </div>
      </section>

      {featured && featured.length > 0 && (() => {
        const PAGE = 3;
        const totalPages = Math.ceil(featured.length / PAGE);
        const page = Math.min(featuredPage, totalPages - 1);
        const start = page * PAGE;
        const visible = featured.slice(start, start + PAGE);
        const canPrev = page > 0;
        const canNext = page < totalPages - 1;
        return (
          <section className="container mx-auto px-4 pt-8">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                <h2 className="text-xl md:text-2xl font-bold">Mais vendidos</h2>
              </div>
              <Link
                to="/conteudos"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Ver todos os conteúdos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              {canPrev && (
                <button
                  type="button"
                  onClick={() => setFeaturedPage((p) => Math.max(0, p - 1))}
                  aria-label="Anteriores"
                  className="hidden md:grid place-items-center absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border hover:bg-accent shadow"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {canNext && (
                <button
                  type="button"
                  onClick={() => setFeaturedPage((p) => Math.min(totalPages - 1, p + 1))}
                  aria-label="Próximos"
                  className="hidden md:grid place-items-center absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border hover:bg-accent shadow"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {visible.map((v) => (
                  <Link
                    key={v.id}
                    to="/$username"
                    params={{ username: v.profiles.username }}
                    className="group"
                  >
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-card border border-border group-hover:border-primary transition">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">Sem capa</div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium line-clamp-2">{v.title}</p>
                    <p className="text-xs text-muted-foreground">por {v.profiles.full_name ?? v.profiles.username}</p>
                    <p className="text-sm text-primary font-semibold mt-1">
                      {v.is_free ? "Grátis" : `R$ ${Number(v.price_brl).toFixed(2).replace(".", ",")}`}
                    </p>
                  </Link>
                ))}
              </div>
              {(canPrev || canNext) && (
                <div className="flex md:hidden justify-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setFeaturedPage((p) => Math.max(0, p - 1))}
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
                    onClick={() => setFeaturedPage((p) => Math.min(totalPages - 1, p + 1))}
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


      <section className="container mx-auto px-4 py-8">

        <div className="flex flex-wrap gap-2 mb-4">
          <ServiceChip
            label="Todas"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {CATEGORY_ORDER.map((cat) => (
            <ServiceChip
              key={cat}
              label={CATEGORY_LABELS[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            />
          ))}
        </div>
        {activeCategory && (
          <div className="flex flex-wrap gap-2 mb-6 p-4 rounded-xl bg-card border border-border">
            {servicesByCategory.get(activeCategory)?.map((s) => (
              <ServiceChip
                key={s.id}
                label={s.label}
                active={activeServices.has(s.id)}
                onClick={() => toggleService(s.id)}
              />
            ))}
          </div>
        )}
        {activeServices.size > 0 && (
          <button
            onClick={() => setActiveServices(new Set())}
            className="text-sm text-primary hover:underline mb-4"
          >
            Limpar filtros ({activeServices.size})
          </button>
        )}
      </section>

      <section className="container mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Nenhuma criadora encontrada com esses filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((c) => (
              <CreatorCard
                key={c.id}
                username={c.username!}
                fullName={c.full_name}
                avatarUrl={c.avatar_url}
                coverPhotoUrl={c.cover_photo_url}
                videoCount={c.videos[0]?.count ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} NaEncolha — Conteúdo exclusivo para maiores de 18 anos.</p>
        </div>
      </footer>
    </div>
  );
}
