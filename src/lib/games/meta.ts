// Couleurs de tuile en attendant les vrais logos des jeux.
export const GAME_META: Record<string, { label: string; accent: string }> = {
  qwirkle: { label: "Qwirkle", accent: "#2F6FB2" },
  uno: { label: "Uno", accent: "#DE5A34" },
  flip7: { label: "Flip 7", accent: "#E9A23B" },
  ascenseur: { label: "Ascenseur", accent: "#5C3A73" },
};

export function gameMeta(code: string) {
  return GAME_META[code] ?? { label: code, accent: "#8A9A6E" };
}
