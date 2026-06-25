import { describe, expect, it } from "vitest";
import { notificationActorUsername, type Notification } from "./notifications";

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
