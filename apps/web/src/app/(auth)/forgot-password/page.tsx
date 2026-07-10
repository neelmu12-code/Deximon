"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { fetchAPI } from "@/lib/fetchAPI";

const SUCCESS_MESSAGE = "If an account exists for that email, a reset link has been sent.";

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to request password reset instructions. Please try again.";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await fetchAPI<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSuccess(response?.message ?? SUCCESS_MESSAGE);
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
        <h1 className="text-2xl font-bold tracking-tight text-ink mb-1">Reset your password</h1>
        <p className="text-[14px] text-ink2 mb-7">
          Enter your account email and we&apos;ll send reset instructions if the account exists.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {success && (
            <div className="rounded-md border border-dx-green/40 bg-dx-green/10 px-3 py-2 text-[13px] text-dx-green">
              <p>{success}</p>
              <p className="mt-1 text-[12px] text-ink2">
                If you signed up with Google, use Continue with Google on the sign-in page.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-dx-red/40 bg-dx-red/10 px-3 py-2 text-[13px] text-dx-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-dx-red text-white text-[15px] font-medium border border-dx-red hover:bg-dx-red-hover hover:border-dx-red-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-ink3">
        Remembered it?{" "}
        <Link href="/login" className="text-ink hover:text-dx-blue transition-colors font-medium">
          Back to sign in -&gt;
        </Link>
      </p>
    </div>
  );
}
