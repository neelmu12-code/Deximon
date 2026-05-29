export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16 bg-base">
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
