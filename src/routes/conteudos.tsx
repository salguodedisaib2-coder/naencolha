import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export const Route = createFileRoute("/conteudos")({
  head: () => ({
    meta: [
      { title: "Conteúdos | NaEncolha" },
      {
        name: "description",
        content:
          "Loja completa: todos os vídeos de criadoras verificadas, com pagamento via PIX e entrega imediata.",
      },
      { property: "og:title", content: "Conteúdos | NaEncolha" },
      {
        property: "og:description",
        content:
          "Explore o catálogo completo de vídeos das criadoras na NaEncolha.",
      },
    ],
  }),
  component: ConteudosPage,
});

type VideoRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  price_brl: number;
  is_free: boolean;
  purchase_count: number;
  created_at: string;
  creator_id: string;
  content_type: string | null;
  profiles: { username: string; full_name: string | null; is_active: boolean };
};

type Sort = "recent" | "popular" | "price_asc" | "price_desc";
type PriceFilter = "all" | "free" | "paid";

function ConteudosPage() {
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const { data: videos, isLoading } = useQuery({
    queryKey: ["all-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select(
          "id, title, thumbnail_url, price_brl, is_free, purchase_count, created_at, content_type, creator_id, profiles!inner(username, full_name, is_active)",
        )
        .eq("is_active", true)
        .eq("profiles.is_active", true);
      if (error) throw error;
      return data as unknown as VideoRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!videos) return [];
    let list = videos.filter((v) => {
      if (priceFilter === "free" && !v.is_free) return false;
      if (priceFilter === "paid" && v.is_free) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          v.title.toLowerCase().includes(q) ||
          v.profiles.username?.toLowerCase().includes(q) ||
          v.profiles.full_name?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "popular":
          return (b.purchase_count ?? 0) - (a.purchase_count ?? 0);
        case "price_asc":
          return Number(a.price_brl) - Number(b.price_brl);
        case "price_desc":
          return Number(b.price_brl) - Number(a.price_brl);
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [videos, search, priceFilter, sort]);

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link to="/" aria-label="NaEncolha">
            <Logo className="h-10 md:h-12 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Início
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

      <section className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Todos os conteúdos</h1>
        <p className="text-muted-foreground mb-6">
          Explore o catálogo completo de vídeos das criadoras.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por vídeo ou criadora..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-card border-border"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={priceFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriceFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={priceFilter === "free" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriceFilter("free")}
            >
              Grátis
            </Button>
            <Button
              variant={priceFilter === "paid" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriceFilter("paid")}
            >
              Pagos
            </Button>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-11 px-3 rounded-md bg-card border border-border text-sm"
          >
            <option value="recent">Mais recentes</option>
            <option value="popular">Mais vendidos</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            Nenhum vídeo encontrado.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((v) => (
              <Link
                key={v.id}
                to="/$username"
                params={{ username: v.profiles.username }}
                className="group"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-card border border-border group-hover:border-primary transition relative">
                  {v.thumbnail_url ? (
                    <img
                      src={v.thumbnail_url}
                      alt={v.title}
                      className={`w-full h-full object-cover ${v.content_type === "photo_pack" && !v.is_free ? "blur-sm scale-105" : ""}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">
                      Sem capa
                    </div>
                  )}
                  {v.content_type === "photo_pack" && !v.is_free && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1 rounded-md bg-background/80 text-foreground text-xs font-extrabold tracking-[0.3em] border border-border shadow backdrop-blur-sm">
                        CENSURADO
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-background/80 text-foreground text-[10px] font-bold tracking-wide backdrop-blur-sm">
                    {v.content_type === "photo_pack" ? "PACK" : "VÍDEO"}
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium line-clamp-2">{v.title}</p>
                <p className="text-xs text-muted-foreground">
                  por {v.profiles.full_name ?? v.profiles.username}
                </p>
                <p className="text-sm text-primary font-semibold mt-1">
                  {v.is_free
                    ? "Grátis"
                    : `R$ ${Number(v.price_brl).toFixed(2).replace(".", ",")}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
