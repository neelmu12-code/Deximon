"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { fetchAPI } from "@/lib/fetchAPI";

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to reset your password. Please try again.";
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get("token");
    setToken(urlToken ?? "");
    if (!urlToken) setError("This reset link is missing a token. Request a new password reset link.");
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!token) {
      setError("This reset link is missing a token. Request a new password reset link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetchAPI<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: { token, new_password: password },
      });
      setSuccess(response?.message ?? "Password has been reset successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(messageFromError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex justify-center mb-8">
        <Link href="/">
          <Wordmark size="lg" />
        </Link>
      </div>

      <div className="bg-surface border border-hair rounded-2xl p-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink mb-1">Choose a new password</h1>
        <p className="text-[14px] text-ink2 mb-7">
          Use a strong password with at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
              New password
            </label>
            <div className="flex items-center gap-2 bg-surface2 border border-hair rounded-md px-3 h-10 focus-within:border-ink2 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink3"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-ink3 hover:text-ink2 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
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

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
              Confirm password
            </label>
            <div className="flex items-center gap-2 bg-surface2 border border-hair rounded-md px-3 h-10 focus-within:border-ink2 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                required
                minLength={8}
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink3"
              />
            </div>
          </div>

          {success && (
            <div className="rounded-md border border-dx-green/40 bg-dx-green/10 px-3 py-2 text-[13px] text-dx-green">
              {success} You can sign in now.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-[13px] text-dx-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full h-11 rounded-md bg-dx-red text-white text-[15px] font-medium border border-dx-red hover:bg-dx-red-hover hover:border-dx-red-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-ink3">
        <Link href="/login" className="text-ink hover:text-dx-blue transition-colors font-medium">
          Back to sign in -&gt;
        </Link>
      </p>
    </div>
  );
}
