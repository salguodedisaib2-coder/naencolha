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
import { Search, Flame } from "lucide-react";

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" aria-label="NaEncolha">
            <Logo className="h-14 md:h-20 w-auto" />
          </Link>
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Área da criadora
          </Link>
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
