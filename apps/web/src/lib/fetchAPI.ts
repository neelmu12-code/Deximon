/**
 * Thin wrapper around `fetch` for the Deximon REST API.
 *
 *  - JSON in, JSON out (or `null` for 204).
 *  - Throws ApiError on non-2xx with the parsed body when possible.
 *  - Includes credentials so cookie-based session work transparently if we
 *    move off pure-JWT later.
 */

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchAPI<T = unknown>(path: string, opts: Options = {}): Promise<T | null> {
  const { body, headers, ...rest } = opts;
  const init: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers as Record<string, string> | undefined),
    },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, init);

  if (res.status === 204) return null;

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : res.statusText) || "Request failed";
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
