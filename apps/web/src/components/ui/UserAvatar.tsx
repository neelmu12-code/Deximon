import Image from "next/image";
import { avatarHue, userDisplayName } from "@/lib/userDisplay";
import { Avatar } from "./Avatar";

type UserAvatarProps = {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
};

export function UserAvatar({
  username,
  displayName,
  avatarUrl,
  size = 32,
  ring = true,
  className = "",
}: UserAvatarProps) {
  const name = userDisplayName({ username, display_name: displayName });

  if (avatarUrl) {
    return (
      <div
        className={[
          "relative rounded-full overflow-hidden shrink-0",
          ring && "ring-2 ring-base outline outline-1 outline-hair",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: size, height: size }}
      >
        <Image src={avatarUrl} alt={name} fill className="object-cover" sizes={`${size}px`} unoptimized />
      </div>
    );
  }

  return <Avatar name={name} hue={avatarHue(username)} size={size} ring={ring} className={className} />;
}
