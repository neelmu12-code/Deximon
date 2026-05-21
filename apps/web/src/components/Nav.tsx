import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

const links = [
  { href: "/", label: "Home" },
  { href: "/binder", label: "Binder" },
  { href: "/market", label: "Marketplace" },
  { href: "/inbox", label: "Inbox" },
] as const;

export function Nav() {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Deximon
        </Link>
        <ul className="flex flex-1 items-center gap-5 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-deximon">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
