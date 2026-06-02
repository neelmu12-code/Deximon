"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/lib/auth";

export default function AuthSuccessPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function finishOAuth() {
      try {
        const user = await refreshUser();
        if (!cancelled) router.replace(user ? "/binder" : "/login?error=oauth_failed");
      } catch {
        if (!cancelled) setError("OAuth completed, but the session could not be loaded.");
      }
    }
    void finishOAuth();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, router]);

  return (
    <div>
      <div className="flex justify-center mb-8">
        <Link href="/">
          <Wordmark size="lg" />
        </Link>
      </div>
      <div className="bg-surface border border-hair rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink mb-2">Finishing sign in</h1>
        <p className="text-[14px] text-ink2">{error ?? "Checking your Deximon session..."}</p>
        {error && (
          <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-dx-blue hover:underline">
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
