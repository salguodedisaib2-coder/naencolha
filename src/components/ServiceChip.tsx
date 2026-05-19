import { cn } from "@/lib/utils";

interface Props {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function ServiceChip({ label, active, onClick, disabled }: Props) {
  const interactive = !!onClick && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm border transition-all select-none",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-glow"
          : "bg-secondary/40 text-foreground/80 border-border",
        interactive && "cursor-pointer hover:border-primary hover:text-foreground",
        !interactive && "cursor-default",
      )}
    >
      {label}
    </button>
  );
}
