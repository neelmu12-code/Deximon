import { describe, expect, it } from "vitest";
import {
  addConversationMessage,
  mergeConversationSnapshot,
  parseChatSocketPayload,
  reconcileConversationMessage,
} from "./chat";
import type { ConversationDetail, Message } from "./marketplace";

function message(id: string, createdAt: string): Message {
  return {
    id,
    conversation_id: "conversation-1",
    sender_id: "user-1",
    sender_username: "buyer",
    body: `Message ${id}`,
    created_at: createdAt,
  };
}

function conversation(messages: Message[]): ConversationDetail {
  return {
    id: "conversation-1",
    listing_id: "listing-1",
    requester_id: "user-1",
    seller_id: "user-2",
    requester_username: "buyer",
    seller_username: "seller",
    listing_card_name: "Pikachu",
    listing_price: 12.5,
    listing_image_url: null,
    listing_status: "available",
    listing_buyer_id: null,
    last_message: messages.at(-1) ?? null,
    unread_count: 0,
    created_at: "2026-07-24T12:00:00Z",
    messages,
  };
}

describe("chat realtime state", () => {
  it("adds a new message once and keeps chronological order", () => {
    const later = message("2", "2026-07-24T12:02:00Z");
    const earlier = message("1", "2026-07-24T12:01:00Z");
    const initial = conversation([later]);

    const updated = addConversationMessage(initial, earlier);
    expect(updated.messages.map((item) => item.id)).toEqual(["1", "2"]);
    expect(addConversationMessage(updated, earlier)).toBe(updated);
    expect(updated.last_message?.id).toBe("2");
  });

  it("replaces an optimistic message with the persisted broadcast", () => {
    const optimistic = {
      ...message("optimistic-1", "2026-07-24T12:01:00Z"),
      body: "Is this available?",
    };
    const saved = {
      ...message("saved-1", "2026-07-24T12:01:01Z"),
      body: "Is this available?",
    };

    const updated = reconcileConversationMessage(conversation([optimistic]), saved);

    expect(updated.messages).toEqual([saved]);
    expect(updated.last_message).toEqual(saved);
  });

  it("merges a reconnect snapshot without losing or duplicating messages", () => {
    const first = message("1", "2026-07-24T12:01:00Z");
    const second = message("2", "2026-07-24T12:02:00Z");

    const merged = mergeConversationSnapshot(conversation([first, second]), {
      ...conversation([first]),
      listing_status: "on_hold",
    });

    expect(merged.messages.map((item) => item.id)).toEqual(["1", "2"]);
    expect(merged.listing_status).toBe("on_hold");
  });

  it("drops an optimistic duplicate once the reconnect snapshot contains it", () => {
    const optimistic = {
      ...message("optimistic-1", "2026-07-24T12:01:00Z"),
      body: "Still available?",
    };
    const saved = {
      ...message("saved-1", "2026-07-24T12:01:01Z"),
      body: "Still available?",
    };

    const merged = mergeConversationSnapshot(conversation([optimistic]), conversation([saved]));

    expect(merged.messages).toEqual([saved]);
  });

  it("accepts supported socket events and ignores malformed payloads", () => {
    const incoming = message("1", "2026-07-24T12:01:00Z");
    expect(parseChatSocketPayload(JSON.stringify({ type: "message", message: incoming }))).toEqual({
      type: "message",
      message: incoming,
    });
    expect(parseChatSocketPayload("not-json")).toBeNull();
    expect(parseChatSocketPayload(JSON.stringify({ type: "message" }))).toBeNull();
  });
});
