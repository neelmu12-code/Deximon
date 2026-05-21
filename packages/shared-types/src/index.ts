/**
 * Shared TS types for the Deximon monorepo.
 *
 * Until we wire up an OpenAPI → TS generator, hand-curate types here
 * from `docs/api/*.yaml`. Keep this file flat; if it grows past ~10 types, split
 * into `auth.ts`, `binder.ts`, `listing.ts`, etc.
 */

export type ListingStatus = "available" | "on_hold" | "sold" | "cancelled";
