// DiceBear avatar configuration
// Renders via the public DiceBear HTTP API — no key needed.
export const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

export function avatarUrl(style: string, seed: string, size = 160) {
  const s = encodeURIComponent(seed || "ostracon");
  return `${DICEBEAR_BASE}/${style}/svg?seed=${s}&size=${size}`;
}

// Curated picker grid: a mix of styles + seeds so the user gets visual variety.
export interface AvatarOption {
  style: string;
  seed: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { style: "bottts-neutral", seed: "luna" },
  { style: "bottts-neutral", seed: "atlas" },
  { style: "bottts-neutral", seed: "ember" },
  { style: "lorelei", seed: "june" },
  { style: "lorelei", seed: "wren" },
  { style: "lorelei", seed: "iris" },
  { style: "fun-emoji", seed: "spark" },
  { style: "fun-emoji", seed: "moon" },
  { style: "fun-emoji", seed: "river" },
  { style: "shapes", seed: "north" },
  { style: "shapes", seed: "delta" },
  { style: "shapes", seed: "vela" },
];