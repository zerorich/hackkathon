const TIERS = [
  { min: 1, name: "Yangi Boshlovchi", icon: "🌱" },
  { min: 3, name: "Jangchi", icon: "⚔️" },
  { min: 6, name: "Ustoz", icon: "🛡️" },
  { min: 10, name: "Chempion", icon: "🏆" },
  { min: 15, name: "Afsona", icon: "👑" },
];

export function heroTier(level) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (level >= t.min) tier = t;
  }
  return tier;
}
