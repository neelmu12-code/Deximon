"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { formatPrice, listingStatusLabel, type Conversation } from "@/lib/marketplace";

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
    let activeController: AbortController | null = null;

    const loadConversations = () => {
      activeController?.abort();
      activeController = new AbortController();
      setLoading(true);

      fetchAPI<Conversation[]>('/conversations', { signal: activeController.signal })
        .then((data) => {
          setConversations(data ?? []);
          setError(null);
        })
        .catch((loadError: unknown) => {
          if (loadError instanceof Error && loadError.name === 'AbortError') return;
          setError(errorMessage(loadError));
          setConversations([]);
        })
        .finally(() => {
          if (activeController?.signal.aborted) return;
          setLoading(false);
        });
    };

    const handleInboxRefresh = () => {
      loadConversations();
    };

    window.addEventListener('inbox:refresh', handleInboxRefresh);
    loadConversations();

    return () => {
      window.removeEventListener('inbox:refresh', handleInboxRefresh);
      activeController?.abort();
    };
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-[#f2f2f0]">Inbox</h1>
        <p className="text-sm text-[#a1a1aa]">
          Your listing-scoped chat threads. Each conversation is tied to a marketplace listing.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-dashed border-[#2a2a2f] bg-[#111216] p-12 text-center text-[#8d8d98]">
          Loading conversations...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-[#5b2124] bg-[#2a1214] p-4 text-sm text-[#ffb4b8]">
          {error}
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <EmptyState
          title="No conversations yet"
          description="Open a marketplace listing to start a conversation with its seller."
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5h14v10H9l-4 4V5Z" />
            </svg>
          }
        />
      )}

      {!loading &&
        !error &&
        conversations.map((conversation) => {
          const unreadCount = conversation.unread_count ?? 0;
          const hasUnread = unreadCount > 0;
          const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

          return (
            <Link
              key={conversation.id}
              href={`/inbox/${conversation.id}`}
              className={`block rounded-2xl border p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition ${
                hasUnread
                  ? "border-[#6a2328] bg-[#161217] hover:border-[#8a2a31] hover:bg-[#1a151b]"
                  : "border-[#2a2a2f] bg-[#111216] hover:border-[#4a2a2d] hover:bg-[#15161b]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className={`truncate ${
                        hasUnread ? "font-semibold text-white" : "font-semibold text-[#f2f2f0]"
                      }`}
                    >
                      {conversation.listing_card_name}
                    </h2>

                    <span className="rounded-full border border-[#3a3a41] bg-[#18191f] px-2 py-0.5 text-[11px] font-medium text-[#d7d7dc]">
                      {listingStatusLabel(conversation.listing_status)}
                    </span>

                    {hasUnread && (
                      <span className="inline-flex min-w-[22px] items-center justify-center rounded-full border border-[#D8232A] bg-[#D8232A] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {unreadLabel}
                      </span>
                    )}
                  </div>

                  <p className={`mt-1 text-sm ${hasUnread ? "text-[#d7d7dc]" : "text-[#b5b5bd]"}`}>
                    @{conversation.requester_username} and @{conversation.seller_username}
                  </p>

                  <p
                    className={`mt-2 line-clamp-2 text-sm ${
                      hasUnread ? "font-medium text-[#ececf1]" : "text-[#8d8d98]"
                    }`}
                  >
                    {conversation.last_message?.body ?? "No messages yet."}
                  </p>
                </div>

                <div className="shrink-0 text-right text-xs text-[#8d8d98]">
                  <div className={`text-sm ${hasUnread ? "font-semibold text-white" : "text-[#d7d7dc]"}`}>
                    {formatPrice(conversation.listing_price)}
                  </div>

                  <div className={`mt-2 ${hasUnread ? "text-[#ff9ea3]" : ""}`}>
                    {conversation.last_message
                      ? new Date(conversation.last_message.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })
                      : "New"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
    </section>
  );
}