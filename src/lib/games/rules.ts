// Aide-mémoire rapide par jeu (pas le règlement officiel complet) — pense-bête
// pour trancher un doute en cours de partie sans ressortir la boîte.
export const GAME_RULES: Record<string, string[]> = {
  qwirkle: [
    "Une ligne ne peut partager qu'un seul point commun : soit la couleur, soit la forme (jamais les deux).",
    "Chaque tuile posée rapporte 1 pt par tuile alignée dans chaque ligne qu'elle complète (une tuile qui complète 2 lignes compte pour les deux).",
    "Une ligne complète de 6 tuiles (Qwirkle) rapporte 6 pts bonus, en plus des 6 pts de la ligne : 12 pts au total.",
    "Le premier joueur à vider son chevalet gagne 6 pts bonus de fin de partie.",
    "Gagnant : le score total le plus haut.",
  ],
  skyjo: [
    "But : avoir le score le plus BAS possible.",
    "Chaque carte compte sa valeur faciale (de -2 à 12).",
    "Dès qu'un joueur a retourné toutes ses cartes, tous les autres jouent un dernier tour.",
    "Si ce joueur n'a pas le score le plus bas de la manche, son score de la manche est doublé.",
    "La partie s'arrête dès qu'un joueur atteint 100 pts cumulés. Gagnant : le score total le plus bas.",
  ],
  flip7: [
    "But : accumuler un maximum de cartes numérotées différentes sans piocher deux fois le même numéro (sinon : bust, 0 pt pour la manche).",
    "On peut s'arrêter volontairement à tout moment pour sécuriser ses points de la manche.",
    "Réussir à collecter 7 numéros différents (\"Flip 7\") rapporte 15 pts bonus.",
    "Cartes modificateurs : les + s'additionnent, le x2 double le total des cartes numérotées de la manche.",
    "La partie s'arrête dès qu'un joueur atteint 200 pts cumulés. Gagnant : le score total le plus haut.",
  ],
};

export function gameRules(code: string): string[] {
  return GAME_RULES[code] ?? [];
}
