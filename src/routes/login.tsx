import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — NaEncolha" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    signup: search.signup === "1" || search.signup === 1 || search.signup === true ? true : false,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signup: signupParam } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(signupParam ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptResponsibility, setAcceptResponsibility] = useState(false);
  const [confirmAge, setConfirmAge] = useState(false);

  const routeByRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuper = (data ?? []).some((r: any) => r.role === "super_admin");
    navigate({ to: isSuper ? "/superadmin" : "/admin" });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeByRole(data.session.user.id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!confirmAge) {
        toast.error("Você precisa confirmar que tem 18 anos ou mais.");
        return;
      }
      if (!acceptPrivacy || !acceptResponsibility) {
        toast.error("Aceite os termos para continuar.");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada!", {
          description: "Verifique seu e-mail para confirmar o cadastro.",
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vinda de volta!");
        if (data.user) await routeByRole(data.user.id);
      }
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-hero">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="NaEncolha" className="flex justify-center mb-8">
          <Logo className="h-28 md:h-36 w-auto" />
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-glow">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Acesse o painel da criadora" : "Cadastre-se como criadora"}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {mode === "signup" && (
              <div className="space-y-3 pt-2">
                <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4">
                  <h3 className="font-bold text-destructive text-sm mb-2">Área 18+</h3>
                  <p className="text-xs text-foreground mb-2">
                    <span className="font-semibold">ECA Digital.</span> Em conformidade com o Estatuto da Criança e do Adolescente Digital, somente após confirmar sua maioridade você poderá acessar áreas restritas do site.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A verificação de idade é feita de forma declaratória neste momento. A plataforma pode solicitar documento de identidade para validação adicional.
                  </p>
                </div>

                <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmAge}
                    onChange={(e) => setConfirmAge(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>Declaro ser <strong>maior de 18 anos</strong> e estar ciente de que esta plataforma contém conteúdo adulto.</span>
                </label>

                <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>Aceito a <a href="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</a>.</span>
                </label>

                <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptResponsibility}
                    onChange={(e) => setAcceptResponsibility(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>
                    Declaro, sob minha própria responsabilidade, que os conteúdos publicados por este usuário serão de maneira pessoal e voluntária, que toda a informação, incluindo a de contato, será relativa à <strong>minha pessoa</strong> e que atuo como <strong>acompanhante independente</strong>, sem mediar nenhum tipo de coerção ou violência. Entendo que em caso de detectar um não cumprimento do anterior os anúncios serão desativados e as autoridades competentes serão avisadas.
                  </span>
                </label>
              </div>
            )}
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground w-full"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
