import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/categories";
import { Play, Ticket } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getFreeVideoUrl } from "@/lib/videos.functions";

interface Props {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl: string | null;
  price: number;
  isFree?: boolean;
  resolution?: string | null;
  durationSeconds?: number | null;
  onBuy: () => void;
}

function formatDuration(sec?: number | null) {
  if (!sec || sec <= 0) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function VideoCard({ id, title, description, thumbnailUrl, price, isFree, resolution, durationSeconds, onBuy }: Props) {
  const [open, setOpen] = useState(false);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(false);
  const fetchFreeUrl = useServerFn(getFreeVideoUrl);

  useEffect(() => {
    if (!open || !isFree || playUrl) return;
    let cancelled = false;
    (async () => {
      setLoadingPlay(true);
      try {
        const res = await fetchFreeUrl({ data: { videoId: id } });
        if (!cancelled && res?.url) setPlayUrl(res.url);
      } catch (e) {
        console.error("Falha ao carregar vídeo gratuito", e);
      } finally {
        if (!cancelled) setLoadingPlay(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, isFree, id, playUrl, fetchFreeUrl]);

  const durationLabel = formatDuration(durationSeconds);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-xl overflow-hidden bg-card border border-border hover:border-primary transition-all group"
      >
        <div className="aspect-video bg-muted relative overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary opacity-30 flex items-center justify-center">
              <Play className="w-12 h-12 text-foreground/50" />
            </div>
          )}
          <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-glow">
            {isFree ? "GRÁTIS" : formatBRL(price)}
          </div>
          {(resolution || durationLabel) && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {resolution && <span className="px-2 py-0.5 rounded bg-background/70 text-foreground text-[10px] font-semibold backdrop-blur-sm">{resolution}</span>}
              {durationLabel && <span className="px-2 py-0.5 rounded bg-background/70 text-foreground text-[10px] font-semibold backdrop-blur-sm">{durationLabel}</span>}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40">
            <Play className="w-16 h-16 text-primary fill-primary" />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1 line-clamp-1">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (isFree) setOpen(true);
              else onBuy();
            }}
            className="w-full bg-gradient-primary"
          >
            {isFree ? "Assistir grátis" : "Comprar via PIX"}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="aspect-video bg-black relative">
            {isFree ? (
              playUrl ? (
                <video
                  src={playUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={thumbnailUrl ?? undefined}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  {loadingPlay ? "Carregando vídeo..." : "Vídeo indisponível"}
                </div>
              )
            ) : thumbnailUrl ? (
              <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-primary opacity-30 flex items-center justify-center">
                <Play className="w-16 h-16 text-foreground/50" />
              </div>
            )}
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-glow">
              {isFree ? "GRÁTIS" : formatBRL(price)}
            </div>
          </div>
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-base whitespace-pre-wrap text-muted-foreground pt-2">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>
            {(resolution || durationLabel) && (
              <p className="text-xs text-muted-foreground mt-3">
                {resolution}{resolution && durationLabel ? " · " : ""}{durationLabel}
              </p>
            )}
            {!isFree && (
              <Button
                onClick={() => {
                  setOpen(false);
                  onBuy();
                }}
                className="w-full bg-gradient-primary mt-6"
              >
                Comprar via PIX — {formatBRL(price)}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
