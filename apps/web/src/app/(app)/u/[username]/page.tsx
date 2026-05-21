type Params = { username: string };

export default async function PublicProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">@{username}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Public profile. Shows display name, bio, avatar, seller rating, and
          the user&apos;s binder if their visibility setting allows.
        </p>
      </header>

      <div className="rounded border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
        Profile data not loaded yet.
      </div>
    </section>
  );
}
