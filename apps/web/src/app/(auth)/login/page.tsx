"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/fetchAPI";

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to sign in. Please try again.";
}

function redirectDestination(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") ? next : "/binder";
}

export default function LoginPage() {
  const router = useRouter();
  const { initializing, login, user } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initializing && user) router.replace("/binder");
  }, [initializing, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      router.replace(redirectDestination());
    } catch (submitError) {
      setError(messageFromError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Wordmark */}
      <div className="flex justify-center mb-8">
        <Link href="/">
          <Wordmark size="lg" />
        </Link>
      </div>

      <div className="bg-surface border border-hair rounded-2xl p-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink mb-1">Sign in</h1>
        <p className="text-[14px] text-ink2 mb-7">Welcome back - your binder is waiting.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
              Email
            </label>
            <div className="flex items-center gap-2 bg-surface2 border border-hair rounded-md px-3 h-10 focus-within:border-ink2 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 8l10 6 10-6" />
              </svg>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink3"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] uppercase tracking-wider text-ink3">Password</label>
              <Link href="/forgot-password" className="text-[12px] text-dx-blue hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="flex items-center gap-2 bg-surface2 border border-hair rounded-md px-3 h-10 focus-within:border-ink2 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
              <input
                type={showPw ? "text" : "password"}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink3"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-ink3 hover:text-ink2 transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-[13px] text-dx-red">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || initializing}
            className="w-full h-11 rounded-md bg-dx-red text-white text-[15px] font-medium border border-dx-red hover:bg-dx-red-hover hover:border-dx-red-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-hair" />
          <span className="text-[11px] text-ink3 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-hair" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={() => window.location.assign(apiUrl("/api/auth/google/login"))}
          className="w-full h-11 rounded-md bg-white text-[#202124] text-[14px] font-medium border border-white hover:bg-[#f5f5f5] transition-colors flex items-center justify-center gap-2.5"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Toggle */}
      <p className="mt-5 text-center text-[13px] text-ink3">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-ink hover:text-dx-blue transition-colors font-medium">
          Sign up -&gt;
        </Link>
      </p>
    </div>
  );
}
