import type { ConversationDetail, Message } from "@/lib/marketplace";

export type ChatSocketPayload =
  | { type: "ready"; conversation_id: string }
  | { type: "message"; message: Message };

function orderedMessages(messages: Message[]): Message[] {
  return [...messages].sort((left, right) => {
    const timestampDifference = Date.parse(left.created_at) - Date.parse(right.created_at);
    return timestampDifference || left.id.localeCompare(right.id);
  });
}

function sameMessage(left: Message, right: Message): boolean {
  return (
    left.sender_id === right.sender_id &&
    left.body === right.body &&
    Math.abs(Date.parse(left.created_at) - Date.parse(right.created_at)) < 15000
  );
}

export function addConversationMessage(
  conversation: ConversationDetail,
  message: Message,
): ConversationDetail {
  if (conversation.messages.some((current) => current.id === message.id)) {
    return conversation;
  }

  const messages = orderedMessages([...conversation.messages, message]);
  return {
    ...conversation,
    messages,
    last_message: messages.at(-1) ?? null,
  };
}

export function reconcileConversationMessage(
  conversation: ConversationDetail,
  message: Message,
  optimisticId?: string,
): ConversationDetail {
  let matchedOptimistic = false;
  const messages = conversation.messages.filter((current) => {
    if (current.id === message.id || current.id === optimisticId) return false;
    if (
      !optimisticId &&
      !matchedOptimistic &&
      current.id.startsWith("optimistic-") &&
      sameMessage(current, message)
    ) {
      matchedOptimistic = true;
      return false;
    }
    return true;
  });

  return addConversationMessage(
    {
      ...conversation,
      messages,
    },
    message,
  );
}

export function mergeConversationSnapshot(
  current: ConversationDetail | null,
  snapshot: ConversationDetail,
): ConversationDetail {
  if (!current) return snapshot;

  const messagesById = new Map<string, Message>();
  for (const message of snapshot.messages) {
    messagesById.set(message.id, message);
  }
  for (const message of current.messages) {
    const matchedBySnapshot =
      message.id.startsWith("optimistic-") &&
      snapshot.messages.some((saved) => sameMessage(message, saved));
    if (!matchedBySnapshot && !messagesById.has(message.id)) {
      messagesById.set(message.id, message);
    }
  }
  const messages = orderedMessages([...messagesById.values()]);

  return {
    ...snapshot,
    messages,
    last_message: messages.at(-1) ?? null,
  };
}

export function parseChatSocketPayload(raw: string): ChatSocketPayload | null {
  try {
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || !("type" in payload)) return null;

    if (
      payload.type === "ready" &&
      "conversation_id" in payload &&
      typeof payload.conversation_id === "string"
    ) {
      return { type: "ready", conversation_id: payload.conversation_id };
    }

    if (
      payload.type === "message" &&
      "message" in payload &&
      payload.message &&
      typeof payload.message === "object" &&
      "id" in payload.message &&
      typeof payload.message.id === "string"
    ) {
      return payload as ChatSocketPayload;
    }
  } catch {
    return null;
  }

  return null;
}
