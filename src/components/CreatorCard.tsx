import { Link } from "@tanstack/react-router";

interface Props {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  videoCount: number;
}

export function CreatorCard({ username, fullName, avatarUrl, coverPhotoUrl, videoCount }: Props) {
  return (
    <Link
      to="/$username"
      params={{ username }}
      className="group rounded-2xl overflow-hidden bg-card border border-border hover:border-primary transition-all hover:shadow-glow"
    >
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {coverPhotoUrl ? (
          <img
            src={coverPhotoUrl}
            alt={fullName || username}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary opacity-40" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent" />
      </div>
      <div className="p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary -mt-10 bg-card shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{fullName || username}</p>
          <p className="text-xs text-muted-foreground truncate">@{username}</p>
        </div>
      </div>
      <div className="px-4 pb-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {videoCount} {videoCount === 1 ? "vídeo" : "vídeos"}
        </span>
        <span className="text-primary font-medium group-hover:underline">Ver perfil →</span>
      </div>
    </Link>
  );
}
