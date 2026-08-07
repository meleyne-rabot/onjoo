import type { GameCategory } from "@/components/GameIcon";

// Ordre d'affichage des catégories — arbitraire mais stable, pour que les
// sections ne sautent pas d'une visite à l'autre.
export const CATEGORY_ORDER: GameCategory[] = ["cartes", "tuiles", "des", "plateau", "exterieur"];

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  cartes: "Cartes",
  tuiles: "Tuiles",
  des: "Dés",
  plateau: "Plateau",
  exterieur: "Extérieur",
};
