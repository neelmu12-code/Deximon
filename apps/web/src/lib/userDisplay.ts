export type DisplayableUser = {
  display_name?: string | null;
  username: string;
};

export function userDisplayName(user: DisplayableUser): string {
  return user.display_name?.trim() || user.username;
}

export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}
