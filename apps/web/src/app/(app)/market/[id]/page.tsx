type Params = { id: string };

export default async function ListingDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Listing #{id}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Card details, asking price, listing status, seller profile, and an
          &ldquo;Open chat&rdquo; action that scopes a conversation to this listing.
        </p>
      </header>

      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Listing payload not loaded yet.
      </div>
    </section>
  );
}
