"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { listingStatusLabel, type Conversation } from "@/lib/marketplace";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not load conversations.";
}

export function InboxClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchAPI<Conversation[]>("/conversations", { signal: controller.signal })
      .then((data) => {
        setConversations(data ?? []);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(errorMessage(loadError));
        setConversations([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Your listing-scoped chat threads. Each conversation is tied to a
          marketplace listing.
        </p>
      </header>

      {loading && (
        <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
          Loading conversations...
        </div>
      )}

      {!loading && error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
          No conversations yet.
        </div>
      )}

      {!loading &&
        !error &&
        conversations.map((conversation) => (
          <Link
            key={conversation.id}
            href={`/inbox/${conversation.id}`}
            className="block rounded border border-neutral-300 bg-white/50 p-4 transition hover:border-neutral-500 dark:border-neutral-800 dark:bg-white/[0.03]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{conversation.listing_card_name}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  @{conversation.requester_username} and @{conversation.seller_username}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {conversation.last_message?.body ?? "No messages yet."}
                </p>
              </div>
              <div className="text-right text-xs text-neutral-500">
                {listingStatusLabel(conversation.listing_status)}
              </div>
            </div>
          </Link>
        ))}
    </section>
  );
}
