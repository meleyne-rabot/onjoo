// Palette inspirée des 6 couleurs et 6 formes du Qwirkle
export const AVATAR_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
] as const;

export const AVATAR_SHAPES = [
  "circle",
  "square",
  "diamond",
  "triangle",
  "star",
  "cross",
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

export function randomAvatar(): { color: AvatarColor; shape: AvatarShape } {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    shape: AVATAR_SHAPES[Math.floor(Math.random() * AVATAR_SHAPES.length)],
  };
}

// Avatar neutre pour un joueur éphémère (pas de fiche players, donc pas
// de couleur/forme choisie à la création).
export const GUEST_PLACEHOLDER_AVATAR = {
  color: "#9a9284",
  shape: "circle" as AvatarShape,
};
