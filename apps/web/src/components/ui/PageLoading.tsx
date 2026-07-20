type PageLoadingProps = {
  label?: string;
};

export function PageLoading({ label = "Loading Deximon" }: PageLoadingProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="animate-pulse space-y-6" aria-hidden="true">
        <div className="h-8 w-48 rounded-md bg-surface2" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-56 rounded-xl border border-hair bg-surface md:col-span-2" />
          <div className="h-56 rounded-xl border border-hair bg-surface" />
        </div>
      </div>
    </div>
  );
}
