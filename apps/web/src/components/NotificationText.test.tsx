import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationText } from "./NotificationText";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("NotificationText", () => {
  it("renders linked @username before review body", () => {
    const html = renderToStaticMarkup(
      <NotificationText
        notification={{
          id: "1",
          type: "review",
          title: "arjon2",
          body: "left you a 5-star review",
          is_read: false,
          meta: {},
          created_at: "2026-06-25T22:00:00Z",
        }}
      />,
    );

    expect(html).toContain('href="/u/arjon2"');
    expect(html).toContain("@arjon2");
    expect(html).toContain("left you a 5-star review");
  });
});
