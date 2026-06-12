"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, fetchAPI } from "@/lib/fetchAPI";
import { type ConversationDetail, type Message } from "@/lib/marketplace";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not load this conversation.";
}

export function ConversationClient({ id }: { id: string }) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchAPI<ConversationDetail>(`/conversations/${id}`, { signal: controller.signal })
      .then((data) => {
        setConversation(data ?? null);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(errorMessage(loadError));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !conversation) return;

    setSending(true);
    setError(null);
    try {
      const message = await fetchAPI<Message>(`/conversations/${conversation.id}/messages`, {
        method: "POST",
        body: { body: trimmed },
      });
      if (!message) throw new Error("Message was not returned.");
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, message],
              last_message: message,
            }
          : current,
      );
      setBody("");
    } catch (sendError) {
      setError(errorMessage(sendError));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        Loading conversation...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="rounded border border-dashed border-neutral-300 p-12 text-center text-neutral-500 dark:border-neutral-700">
        {error ?? "Conversation not found."}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm text-neutral-500">
          <Link href="/inbox" className="hover:underline">
            Inbox
          </Link>{" "}
          / {conversation.listing_card_name}
        </p>
        <h1 className="text-2xl font-semibold">{conversation.listing_card_name}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          @{conversation.requester_username} and @{conversation.seller_username}
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex h-[480px] flex-col rounded border border-neutral-300 dark:border-neutral-700">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {conversation.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-neutral-500">
              No messages yet.
            </div>
          ) : (
            conversation.messages.map((message) => (
              <div
                key={message.id}
                className="max-w-[80%] rounded-lg border border-neutral-300 bg-white/60 p-3 text-sm dark:border-neutral-800 dark:bg-white/[0.04]"
              >
                <div className="mb-1 text-xs font-medium text-neutral-500">
                  @{message.sender_username}
                </div>
                <p>{message.body}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2 border-t border-neutral-300 p-3 dark:border-neutral-700">
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder="Write a message..."
            className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>

      <p className="text-xs text-neutral-500">
        Realtime can attach to <code>/conversations/{conversation.id}/ws</code>;
        REST persistence is wired now so reloads keep history.
      </p>
    </section>
  );
}
