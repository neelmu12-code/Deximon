"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError, fetchAPI, wsUrl } from "@/lib/fetchAPI";
import {
  formatPrice,
  listingStatusLabel,
  type ConversationDetail,
  type Message,
} from "@/lib/marketplace";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not load this conversation.";
}

function cookieValue(name: string): string | null {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

function notifyInboxRefresh() {
  window.dispatchEvent(new CustomEvent("inbox:refresh"));
}

function avatarText(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function sameMessage(a: Message, b: Message): boolean {
  return (
    a.sender_id === b.sender_id &&
    a.body === b.body &&
    Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 15000
  );
}

export function ConversationClient({ id }: { id: string }) {
  const { initializing, user } = useAuth();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  const currentUserId = user?.id ?? null;
  const listingHref = conversation ? `/market/${conversation.listing_id}` : "/market";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetchAPI<ConversationDetail>(`/conversations/${id}`, { signal: controller.signal })
      .then((data) => {
        setConversation(data ?? null);
        seenMessageIdsRef.current = new Set((data?.messages ?? []).map((message) => message.id));
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

  useEffect(() => {
    if (!conversation) return;

    let cancelled = false;
    let reconnectAttempts = 0;

    const connect = () => {
      if (cancelled) return;

      const url = new URL(wsUrl(`/conversations/${conversation.id}/ws`));
      const token =
        cookieValue("access_token") ||
        cookieValue("token") ||
        cookieValue("auth_token");

      if (token) url.searchParams.set("token", token);

      const socket = new WebSocket(url.toString());
      socketRef.current = socket;

      socket.onopen = () => {
        if (socketRef.current !== socket) return;

        reconnectAttempts = 0;
        setSocketConnected(true);

        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as {
          type: string;
          conversation_id?: string;
          message?: Message;
        };

        const incoming = payload.message;
        if (payload.type !== "message" || !incoming) return;

        notifyInboxRefresh();

        setConversation((current) => {
          if (!current) return current;

          if (seenMessageIdsRef.current.has(incoming.id)) {
            return current;
          }

          const optimisticIndex = current.messages.findIndex(
            (item) => item.id.startsWith("optimistic-") && sameMessage(item, incoming),
          );

          if (optimisticIndex >= 0) {
            const nextMessages = [...current.messages];
            nextMessages[optimisticIndex] = incoming;
            seenMessageIdsRef.current.add(incoming.id);

            return {
              ...current,
              messages: nextMessages,
              last_message: incoming,
            };
          }

          seenMessageIdsRef.current.add(incoming.id);
          return {
            ...current,
            messages: [...current.messages, incoming],
            last_message: incoming,
          };
        });
      };

      socket.onerror = () => {
        if (socketRef.current !== socket) return;
        socket.close();
      };

      socket.onclose = () => {
        setSocketConnected(false);
        if (cancelled) return;

        reconnectAttempts += 1;
        const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempts, 4), 10000);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [conversation?.id]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();

    if (!trimmed || !conversation || !currentUserId || initializing) return;

    setSending(true);
    setError(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      sender_username: user?.username ?? "You",
      body: trimmed,
      created_at: new Date().toISOString(),
    };

    seenMessageIdsRef.current.add(optimisticId);
    setConversation((current) =>
      current
        ? {
            ...current,
            messages: [...current.messages, optimisticMessage],
            last_message: optimisticMessage,
          }
        : current,
    );
    setBody("");

    try {
      const socket = socketRef.current;

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(trimmed);
        notifyInboxRefresh();
      } else {
        const message = await fetchAPI<Message>(`/conversations/${conversation.id}/messages`, {
          method: "POST",
          body: { body: trimmed },
        });

        if (!message) throw new Error("Message was not returned.");
        seenMessageIdsRef.current.add(message.id);

        setConversation((current) =>
          current
            ? {
                ...current,
                messages: current.messages.map((item) =>
                  item.id === optimisticId ? message : item,
                ),
                last_message: message,
              }
            : current,
        );
      }
    } catch (sendError) {
      seenMessageIdsRef.current.delete(optimisticId);

      setConversation((current) => {
        if (!current) return current;

        const nextMessages = current.messages.filter((item) => item.id !== optimisticId);

        return {
          ...current,
          messages: nextMessages,
          last_message:
            current.last_message?.id === optimisticId ? nextMessages.at(-1) ?? null : current.last_message,
        };
      });

      setBody(trimmed);
      setError(errorMessage(sendError));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#2a2a2f] bg-[#111216] p-12 text-center text-[#a1a1aa]">
        Loading conversation...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="rounded-2xl border border-[#2a2a2f] bg-[#111216] p-12 text-center text-[#a1a1aa]">
        {error ?? "Conversation not found."}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-[#2a2a2f] bg-[#111216] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
        <p className="text-sm text-[#8d8d98]">
          <Link href="/inbox" className="hover:text-white hover:underline">
            Inbox
          </Link>{" "}
          / {conversation.listing_card_name}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-xl border border-[#2a2a2f] bg-[#18191f]">
            {conversation.listing_image_url ? (
              <img
                src={conversation.listing_image_url}
                alt={conversation.listing_card_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-[#8d8d98]">
                No image
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-[#f2f2f0]">
                {conversation.listing_card_name}
              </h1>
              <span className="rounded-full border border-[#3a3a41] bg-[#18191f] px-2.5 py-1 text-xs font-medium text-[#d7d7dc]">
                {listingStatusLabel(conversation.listing_status)}
              </span>
            </div>

            <p className="mt-1 text-sm text-[#b5b5bd]">
              @{conversation.requester_username} and @{conversation.seller_username}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#8d8d98]">
              <span>{formatPrice(conversation.listing_price)}</span>
              <Link href={listingHref} className="text-[#D8232A] hover:underline">
                View listing
              </Link>
              <span className={socketConnected ? "text-emerald-400" : "text-amber-400"}>
                {socketConnected ? "Live" : "Reconnecting..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-[#5b2124] bg-[#2a1214] p-4 text-sm text-[#ffb4b8]">
          {error}
        </div>
      )}

      <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-[#2a2a2f] bg-[#111216] shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
        <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
          {conversation.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[#8d8d98]">
              No messages yet.
            </div>
          ) : (
            conversation.messages.map((message) => {
              const isMine = message.sender_id === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[88%] items-end gap-2 ${
                      isMine ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        isMine
                          ? "border-[#7a1d22] bg-[#2b1113] text-[#ff8c92]"
                          : "border-[#34343a] bg-[#18191f] text-[#d0d0d6]"
                      }`}
                    >
                      {avatarText(message.sender_username)}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm shadow-[0_6px_18px_rgba(0,0,0,0.18)] ${
                        isMine
                          ? "bg-[#D8232A] text-white"
                          : "border border-[#2a2a2f] bg-[#18191f] text-[#f2f2f0]"
                      }`}
                    >
                      <div
                        className={`mb-1 text-[11px] font-medium ${
                          isMine ? "text-red-100" : "text-[#8d8d98]"
                        }`}
                      >
                        @{message.sender_username}
                      </div>

                      <p className="whitespace-pre-wrap break-words">{message.body}</p>

                      <div
                        className={`mt-2 text-[11px] ${
                          isMine ? "text-red-100" : "text-[#8d8d98]"
                        }`}
                      >
                        {new Date(message.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={sendMessage}
          className="flex gap-2 border-t border-[#2a2a2f] bg-[#111216] p-3 md:p-4"
        >
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder="Write a message..."
            className="min-w-0 flex-1 rounded-xl border border-[#2a2a2f] bg-[#18191f] px-3 py-2.5 text-sm text-[#f2f2f0] outline-none placeholder:text-[#70707a] focus:border-[#D8232A]"
          />
          <button
            type="submit"
            disabled={initializing || sending || !body.trim()}
            className="rounded-xl bg-[#D8232A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#b91c22] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}