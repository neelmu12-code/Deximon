"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

type Props = { username: string };

export function EditProfileButton({ username }: Props) {
  const { user, initializing } = useAuth();
  if (initializing || !user || user.username !== username) return null;
  return (
    <Link
      href="/settings"
      className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-md bg-dx-red text-white hover:bg-[#B71C2C] transition-colors"
    >
      Edit profile
    </Link>
  );
}
