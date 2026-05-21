type Params = { id: string };

export default async function ConversationPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Conversation #{id}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Realtime chat thread scoped to one listing. Messages stream over a
          WebSocket connection and persist server-side, so reloading reloads the
          full history.
        </p>
      </header>

      <div className="flex h-[400px] flex-col rounded border border-dashed border-neutral-300 dark:border-neutral-700">
        <div className="flex flex-1 items-center justify-center text-neutral-500">
          No messages yet.
        </div>
        <div className="border-t border-dashed border-neutral-300 p-3 text-sm text-neutral-500 dark:border-neutral-700">
          Message composer.
        </div>
      </div>
    </section>
  );
}
