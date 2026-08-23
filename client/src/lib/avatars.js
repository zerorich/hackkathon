// Named seeds for the onboarding avatar picker — each renders a distinct
// illustrated avatar via DiceBear (deterministic per seed, real generated art,
// not a stock photo or hand-picked image).
export const AVATAR_PRESETS = [
  "fox",
  "panda",
  "tiger",
  "lion",
  "koala",
  "owl",
  "wolf",
  "dragon",
  "otter",
  "falcon",
  "lynx",
  "whale",
];

export function avatarImageUrl(seed) {
  const safeSeed = encodeURIComponent(seed || "zehna");
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export function avatarInitial(displayName) {
  return (displayName || "?").trim().charAt(0).toUpperCase() || "?";
}
