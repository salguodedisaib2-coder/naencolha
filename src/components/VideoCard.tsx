import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/categories";
import { Play } from "lucide-react";

interface Props {
  title: string;
  description?: string | null;
  thumbnailUrl: string | null;
  price: number;
  onBuy: () => void;
}

export function VideoCard({ title, description, thumbnailUrl, price, onBuy }: Props) {
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary transition-all group">
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
          {formatBRL(price)}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40">
          <Play className="w-16 h-16 text-primary fill-primary" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
        )}
        <Button onClick={onBuy} className="w-full bg-gradient-primary">
          Comprar via PIX
        </Button>
      </div>
    </div>
  );
}
