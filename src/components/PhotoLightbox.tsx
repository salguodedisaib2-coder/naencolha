import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  photos: string[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

export function PhotoLightbox({ photos, index, onClose, onIndexChange }: Props) {
  useEffect(() => {
    if (index === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, photos.length, onClose, onIndexChange]);

  if (index === null) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-card border border-border hover:bg-secondary"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>
      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index - 1);
          }}
          className="absolute left-4 p-3 rounded-full bg-card border border-border hover:bg-secondary"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index + 1);
          }}
          className="absolute right-4 p-3 rounded-full bg-card border border-border hover:bg-secondary"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      <img
        src={photos[index]}
        alt=""
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
