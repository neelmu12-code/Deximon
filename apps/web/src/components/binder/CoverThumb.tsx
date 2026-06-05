import type { BinderCoverConfig } from "@/lib/binderTypes";
import { COVER_COLORS } from "@/lib/binderTypes";

type Props = {
  cfg: BinderCoverConfig;
  size?: number;
  username?: string;
};

export function CoverThumb({ cfg, size = 48, username }: Props) {
  const color = COVER_COLORS.find((c) => c.id === cfg.colorId) ?? COVER_COLORS[0];
  const bg =
    cfg.type === "color"
      ? `linear-gradient(160deg, ${color.a} 0%, ${color.b} 55%, ${color.c} 100%)`
      : cfg.imageUrl
      ? `url(${cfg.imageUrl}) center/cover`
      : `linear-gradient(160deg, ${color.a} 0%, ${color.b} 55%, ${color.c} 100%)`;

  return (
    <div
      className="rounded relative overflow-hidden flex-shrink-0"
      style={{ width: size, height: Math.round((size * 4) / 3), background: bg }}
    >
      {cfg.showName && username && (
        <div
          className="absolute inset-x-0 bottom-1.5 text-center script gold-foil px-1 leading-tight truncate"
          style={{ fontSize: Math.max(8, Math.round(size * 0.14)) }}
        >
          {username}&apos;s
        </div>
      )}
    </div>
  );
}
