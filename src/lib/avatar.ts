// Palette de marque Onjoo (charte graphique) — cf. handoff design.
export const AVATAR_COLORS = [
  "#163D2E",
  "#E9A23B",
  "#DE5A34",
  "#2F6FB2",
  "#5C3A73",
  "#8A9A6E",
] as const;

// Formes façon Qwirkle redessinées (rond, carré, triangle, étoile,
// trèfle, cœur) — cf. avatars/*.svg du handoff design.
export const AVATAR_SHAPES = [
  "circle",
  "square",
  "triangle",
  "star",
  "clover",
  "heart",
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

type AvatarCombo = { color: AvatarColor; shape: AvatarShape };

// Assigné au hasard parmi les combinaisons pas encore prises par un
// autre joueur de la ligue (`taken`) — si toutes les 36 combinaisons
// sont prises, retombe sur un tirage totalement aléatoire.
export function randomAvatar(
  taken: { avatar_color: string; avatar_shape: string }[] = [],
): AvatarCombo {
  const takenSet = new Set(taken.map((t) => `${t.avatar_color}|${t.avatar_shape}`));
  const combos: AvatarCombo[] = [];
  for (const color of AVATAR_COLORS) {
    for (const shape of AVATAR_SHAPES) {
      if (!takenSet.has(`${color}|${shape}`)) combos.push({ color, shape });
    }
  }
  const pool =
    combos.length > 0
      ? combos
      : AVATAR_COLORS.flatMap((color) => AVATAR_SHAPES.map((shape) => ({ color, shape })));
  return pool[Math.floor(Math.random() * pool.length)];
}

// Avatar neutre pour un joueur éphémère (pas de fiche players, donc pas
// de couleur/forme choisie à la création).
export const GUEST_PLACEHOLDER_AVATAR = {
  color: "#9a9284",
  shape: "circle" as AvatarShape,
};
