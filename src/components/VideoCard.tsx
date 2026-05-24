import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/categories";
import { Play, Ticket, Images, Film } from "lucide-react";
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
  contentType?: "video" | "photo_pack" | "video_pack" | string | null;
  photoCount?: number;
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

export function VideoCard({ id, title, description, thumbnailUrl, price, isFree, resolution, durationSeconds, contentType, photoCount, onBuy }: Props) {
  const [open, setOpen] = useState(false);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(false);
  const fetchFreeUrl = useServerFn(getFreeVideoUrl);
  const isPhotoPack = contentType === "photo_pack";
  const isVideoPack = contentType === "video_pack";
  const isPack = isPhotoPack || isVideoPack;

  useEffect(() => {
    if (!open || isPack || !isFree || playUrl) return;
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
  }, [open, isFree, isPack, id, playUrl, fetchFreeUrl]);

  const durationLabel = formatDuration(durationSeconds);
  const PackIcon = isVideoPack ? Film : Images;
  const typeLabel = isVideoPack
    ? (photoCount && photoCount > 1 ? `PACK ${photoCount} VÍDEOS` : "PACK VÍDEOS")
    : isPhotoPack
    ? (photoCount && photoCount > 1 ? `PACK ${photoCount} FOTOS` : "FOTO")
    : "VÍDEO";

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
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isPack && !isFree ? "blur-sm scale-105" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary opacity-30 flex items-center justify-center">
              {isPack ? <PackIcon className="w-12 h-12 text-foreground/50" /> : <Play className="w-12 h-12 text-foreground/50" />}
            </div>
          )}
          {isPack && !isFree && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="px-4 py-1.5 rounded-md bg-background/80 text-foreground text-sm font-extrabold tracking-[0.3em] border border-border shadow-lg backdrop-blur-sm">
                CENSURADO
              </span>
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-background/80 text-foreground text-[10px] font-bold tracking-wide backdrop-blur-sm flex items-center gap-1">
            {isPack ? <PackIcon className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {typeLabel}
          </div>
          <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-glow">
            {isFree ? "GRÁTIS" : formatBRL(price)}
          </div>
          {!isPack && (resolution || durationLabel) && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {resolution && <span className="px-2 py-0.5 rounded bg-background/70 text-foreground text-[10px] font-semibold backdrop-blur-sm">{resolution}</span>}
              {durationLabel && <span className="px-2 py-0.5 rounded bg-background/70 text-foreground text-[10px] font-semibold backdrop-blur-sm">{durationLabel}</span>}
            </div>
          )}
          {!isPack && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40">
              <Play className="w-16 h-16 text-primary fill-primary" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1 line-clamp-1">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (!isPack && isFree) setOpen(true);
              else onBuy();
            }}
            className="w-full bg-gradient-primary"
          >
            {isPack ? "Comprar via PIX" : (isFree ? "Assistir grátis" : "Comprar via PIX")}
          </Button>
          {!isFree && (
            <Link
              to="/voucher"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Ticket className="w-3.5 h-3.5" />
              Já tenho voucher
            </Link>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="aspect-video bg-black relative">
            {isPack ? (
              thumbnailUrl ? (
                <>
                  <img src={thumbnailUrl} alt={title} className={`w-full h-full object-cover ${!isFree ? "blur-sm scale-105" : ""}`} />
                  {!isFree && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="px-6 py-2 rounded-md bg-background/80 text-foreground text-lg font-extrabold tracking-[0.4em] border border-border shadow-lg backdrop-blur-sm">
                        CENSURADO
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <PackIcon className="w-16 h-16" />
                </div>
              )
            ) : isFree ? (
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
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/80 text-foreground text-xs font-bold tracking-wide backdrop-blur-sm flex items-center gap-1">
              {isPack ? <PackIcon className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {typeLabel}
            </div>
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
            {!isPack && (resolution || durationLabel) && (
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
