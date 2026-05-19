import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "naencolha:age-confirmed";

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY) !== "yes") setOpen(true);
  }, []);

  if (!open) return null;

  const confirm = () => {
    localStorage.setItem(KEY, "yes");
    setOpen(false);
  };

  const deny = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-glow">
        <h2 className="text-3xl font-bold mb-3">Conteúdo adulto</h2>
        <p className="text-muted-foreground mb-2">
          Este site contém material destinado exclusivamente a maiores de 18 anos.
        </p>
        <p className="text-foreground font-medium mb-6">Você tem 18 anos ou mais?</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={deny}>
            Não, sair
          </Button>
          <Button className="flex-1 bg-gradient-primary" onClick={confirm}>
            Sim, entrar
          </Button>
        </div>
      </div>
    </div>
  );
}
