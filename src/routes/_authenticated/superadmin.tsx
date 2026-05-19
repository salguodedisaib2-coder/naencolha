import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { formatBRL } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/superadmin")({
  head: () => ({ meta: [{ title: "Super Admin — NaEncolha" }] }),
  component: SuperAdmin,
});

function SuperAdmin() {
  const qc = useQueryClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setAuthorized(false);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      setAuthorized(!!roles);
    });
  }, []);

  const { data: creators } = useQuery({
    queryKey: ["all-creators"],
    enabled: authorized === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, is_active, created_at, videos(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    enabled: authorized === true,
    queryFn: async () => {
      const { data } = await supabase.from("purchases").select("amount_paid").eq("status", "paid");
      const total = (data ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
      return { totalSales: total, totalPurchases: data?.length ?? 0 };
    },
  });

  if (authorized === null) return <div className="p-8 text-center">Verificando...</div>;
  if (!authorized) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Acesso negado</h1>
        <p className="text-muted-foreground mb-4">Apenas super admins têm acesso a esta área.</p>
        <Link to="/admin" className="text-primary hover:underline">Ir para meu painel</Link>
      </div>
    );
  }

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("profiles").update({ is_active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-creators"] });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Super Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-6 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground">Criadoras</p>
          <p className="text-2xl font-bold">{creators?.length ?? 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground">Vendas concluídas</p>
          <p className="text-2xl font-bold">{stats?.totalPurchases ?? 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-primary text-primary-foreground">
          <p className="text-sm opacity-90">Receita total</p>
          <p className="text-2xl font-bold">{formatBRL(stats?.totalSales ?? 0)}</p>
        </div>
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        {creators?.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between p-4 border-b border-border last:border-0">
            <div>
              <p className="font-medium">{c.full_name || "(sem nome)"}</p>
              <p className="text-sm text-muted-foreground">@{c.username ?? "—"} · {c.videos[0]?.count ?? 0} vídeos</p>
            </div>
            <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
