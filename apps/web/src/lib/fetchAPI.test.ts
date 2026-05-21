import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, fetchAPI } from "./fetchAPI";

describe("fetchAPI", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on 200", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const out = await fetchAPI<{ ok: boolean }>("/healthz");
    expect(out).toEqual({ ok: true });
  });

  it("returns null on 204", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );
    const out = await fetchAPI("/me");
    expect(out).toBeNull();
  });

  it("throws ApiError on 4xx with parsed payload", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "bad creds" }), { status: 401 }),
    );
    await expect(fetchAPI("/login", { method: "POST", body: { x: 1 } })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("preserves ApiError class", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("nope", { status: 500 }),
    );
    await expect(fetchAPI("/x")).rejects.toBeInstanceOf(ApiError);
  });
});
