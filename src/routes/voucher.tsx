import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Ticket } from "lucide-react";

export const Route = createFileRoute("/voucher")({
  head: () => ({
    meta: [
      { title: "Acessar voucher — NaEncolha" },
      { name: "description", content: "Digite seu código de voucher para assistir e baixar o vídeo que você comprou." },
    ],
  }),
  component: VoucherEntryPage,
});

function VoucherEntryPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (clean.length < 4) {
      toast.error("Digite um código válido.");
      return;
    }
    setLoading(true);
    navigate({ to: "/voucher/$code", params: { code: clean } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" aria-label="NaEncolha">
            <Logo className="h-10 md:h-12 w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 text-primary mb-4">
              <Ticket className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Acessar seu voucher</h1>
            <p className="text-muted-foreground">
              Digite o código que você recebeu da acompanhante após confirmar o pagamento via PIX.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: MIRE-7K2X"
              className="text-center text-2xl tracking-widest font-mono h-14"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
            />
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary h-12 text-base">
              {loading ? "Validando..." : "Acessar vídeo"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Ainda não tem voucher? Volte ao perfil da acompanhante e clique em "Comprar via PIX".
          </p>
        </div>
      </main>
    </div>
  );
}
