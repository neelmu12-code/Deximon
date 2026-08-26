import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sourcePaths = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/demo/page.tsx",
  "components/Brand.tsx",
  "components/DemoApp.tsx",
  "components/HeroShelf.tsx",
  "lib/demo-data.ts",
];

const source = sourcePaths
  .map((path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8"))
  .join("\n");

test("the showcase has no original-backend runtime integration", () => {
  const forbiddenPatterns = [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /new\s+WebSocket\s*\(/,
    /localhost:\d+/,
    /NEXT_PUBLIC_API_URL/,
    /NEXT_PUBLIC_SCANNER_URL/,
    /API_URL/,
    /SCANNER_URL/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern);
  }
});

test("every requested demo product area is represented", () => {
  for (const view of [
    "scanner",
    "binder",
    "marketplace",
    "listing",
    "profile",
    "inbox",
    "notifications",
    "reviews",
  ]) {
    assert.match(source, new RegExp(`\\b${view}\\b`));
  }
});

test("Next.js is configured for a route-safe static export", () => {
  const config = readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");
  assert.match(config, /output:\s*["']export["']/);
  assert.match(config, /trailingSlash:\s*true/);
  assert.match(config, /unoptimized:\s*true/);
});

test("Vercel configuration includes baseline response headers", () => {
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(vercel.framework, "nextjs");
  const keys = new Set(vercel.headers.flatMap((rule) => rule.headers.map((header) => header.key)));
  assert.ok(keys.has("X-Content-Type-Options"));
  assert.ok(keys.has("X-Frame-Options"));
  assert.ok(keys.has("Referrer-Policy"));
  assert.ok(keys.has("Permissions-Policy"));
});
