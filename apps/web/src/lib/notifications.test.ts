import { describe, expect, it } from "vitest";
import {
  notificationActionLabel,
  notificationActorUsername,
  notificationHref,
  type Notification,
} from "./notifications";

const reviewNotification: Notification = {
  id: "1",
  type: "review",
  title: "arjon2",
  body: "left you a 5-star review",
  is_read: false,
  meta: {},
  created_at: "2026-06-25T22:00:00Z",
};

describe("notificationActorUsername", () => {
  it("uses title when present", () => {
    expect(notificationActorUsername(reviewNotification)).toBe("arjon2");
  });

  it("prefers meta.reviewer_username", () => {
    expect(
      notificationActorUsername({
        ...reviewNotification,
        title: "",
        meta: { reviewer_username: "buyer1" },
      }),
    ).toBe("buyer1");
  });

  it("returns null when no actor is available", () => {
    expect(
      notificationActorUsername({
        ...reviewNotification,
        title: "   ",
        meta: {},
      }),
    ).toBeNull();
  });
});

describe("notificationHref", () => {
  it("sends a review prompt to the review page for that sale", () => {
    expect(
      notificationHref({
        ...reviewNotification,
        type: "review_prompt",
        body: "sold you Charizard — leave a review",
        meta: { conversation_id: "c1", listing_id: "l1" },
      }),
    ).toBe("/review/l1");
  });

  it("falls back to the chat for prompts sent before the review page existed", () => {
    expect(
      notificationHref({
        ...reviewNotification,
        type: "review_prompt",
        meta: { conversation_id: "c1" },
      }),
    ).toBe("/inbox/c1?review=1");
  });

  it("sends a message to its conversation and a status change to its listing", () => {
    expect(
      notificationHref({
        ...reviewNotification,
        type: "message",
        meta: { conversation_id: "c1", listing_id: "l1" },
      }),
    ).toBe("/inbox/c1");
    expect(
      notificationHref({
        ...reviewNotification,
        type: "listing_status",
        meta: { listing_id: "l1" },
      }),
    ).toBe("/market/l1");
  });

  it("returns null when the target is missing from meta", () => {
    expect(
      notificationHref({ ...reviewNotification, type: "review_prompt", meta: {} }),
    ).toBeNull();
    expect(notificationHref({ ...reviewNotification, type: "review", meta: {} })).toBeNull();
  });
});

describe("notificationActionLabel", () => {
  it("labels the actionable notifications and leaves the rest alone", () => {
    expect(
      notificationActionLabel({ ...reviewNotification, type: "review_prompt" }),
    ).toBe("Leave a review");
    expect(notificationActionLabel({ ...reviewNotification, type: "message" })).toBe("Open chat");
    expect(notificationActionLabel({ ...reviewNotification, type: "review" })).toBeNull();
  });
});
