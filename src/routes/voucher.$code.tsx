import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { redeemVoucher } from "@/lib/vouchers.functions";
import { Download, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/voucher/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Voucher ${params.code} — NaEncolha` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VoucherPlayerPage,
});

function VoucherPlayerPage() {
  const { code } = Route.useParams();
  const redeem = useServerFn(redeemVoucher);

  const { data, isLoading, error } = useQuery({
    queryKey: ["voucher", code],
    queryFn: () => redeem({ data: { code } }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" aria-label="NaEncolha">
            <Logo className="h-10 md:h-12 w-auto" />
          </Link>
          <Link to="/voucher" className="text-sm text-muted-foreground hover:text-primary">
            Outro voucher
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Não foi possível abrir este voucher</h1>
            <p className="text-muted-foreground mb-6">{(error as Error).message}</p>
            <Link to="/voucher">
              <Button variant="outline">Tentar outro código</Button>
            </Link>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <video
                src={data.streamUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full"
                poster={data.video.thumbnailUrl ?? undefined}
              />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{data.video.title}</h1>
              {data.creator.fullName && (
                <p className="text-muted-foreground mt-1">
                  por{" "}
                  {data.creator.username ? (
                    <Link to="/$username" params={{ username: data.creator.username }} className="text-primary hover:underline">
                      {data.creator.fullName}
                    </Link>
                  ) : (
                    data.creator.fullName
                  )}
                </p>
              )}
              {data.video.description && (
                <p className="mt-4 text-foreground/90 whitespace-pre-line">{data.video.description}</p>
              )}
            </div>

            <a href={data.downloadUrl} download className="block">
              <Button className="w-full bg-gradient-primary h-12 text-base">
                <Download className="w-5 h-5 mr-2" />
                Baixar vídeo
              </Button>
            </a>

            <p className="text-xs text-muted-foreground text-center">
              Voucher: <span className="font-mono font-semibold">{code}</span> · guarde este link para reassistir quando quiser.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
