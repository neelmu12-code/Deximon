import Link from "next/link";

export const metadata = {
  title: "Log in — Deximon",
};

export default function LoginPage() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold">Log in</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Sign in with email and password, or continue with Google.
      </p>

      <div className="mt-6 rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Login form coming.
      </div>

      <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
        New here?{" "}
        <Link href="/signup" className="text-deximon hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
