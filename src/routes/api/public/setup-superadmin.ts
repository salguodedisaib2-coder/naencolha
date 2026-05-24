import { createFileRoute } from "@tanstack/react-router";
import { seedTestSuperAdmin } from "@/lib/superadmin.functions";

export const Route = createFileRoute("/api/public/setup-superadmin")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await seedTestSuperAdmin();
          return Response.json(result);
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async () => {
        try {
          const result = await seedTestSuperAdmin();
          return Response.json(result);
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
