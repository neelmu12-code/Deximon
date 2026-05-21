/**
 * UserMenu — PLACEHOLDER.
 *
 * Eventually a click-to-open dropdown anchored to the user's avatar in
 * the top-right of the nav, with the following items:
 *   - View profile  → /u/[current username]
 *   - Settings      → /settings
 *   - Log out       → POST /auth/logout, then redirect to /
 *
 * Right now there is no auth state to read, so this component renders
 * a static grey circle that does nothing. We deliberately do NOT link
 * it to /login or /signup — those flows are entered from the home
 * page's "Sign in" / "Sign up" calls-to-action, and once auth lands
 * this slot is reserved for the avatar of the signed-in user.
 *
 * When auth lands:
 *   1. Mark this `"use client"`.
 *   2. Read the current user from the AuthContext / session hook.
 *   3. If no user, render a "Sign in" link button instead of an avatar.
 *   4. If signed in, render the avatar and wire up a real dropdown
 *      (likely Radix DropdownMenu — left out for now to keep the
 *      placeholder dep-free).
 */
export function UserMenu() {
  return (
    <div
      role="img"
      aria-label="User menu (placeholder — auth not yet wired)"
      title="User menu (coming soon)"
      className="h-9 w-9 rounded-full bg-neutral-300 dark:bg-neutral-700"
    />
  );
}
