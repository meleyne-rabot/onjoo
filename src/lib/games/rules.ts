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
  yams: [
    "13 catégories à remplir dans l'ordre de ton choix, une seule fois chacune. 3 lancers de dés par tour, en gardant ceux que tu veux entre chaque lancer.",
    "Partie supérieure (Un à Six) : la valeur × le nombre de dés de cette face. Bonus de +35 pts si le sous-total atteint 63 pts.",
    "Brelan / Carré : la somme des dés identiques uniquement (3 ou 4 dés, pas les 5) — choisis directement la face obtenue, le calcul se fait tout seul.",
    "Full : 25 pts fixes.",
    "Petite suite : 25 pts fixes.",
    "Grande suite : 40 pts par le haut (2-3-4-5-6), 30 pts par le bas (1-2-3-4-5).",
    "Yam's : 50 pts fixes (les 5 dés identiques).",
    "Chance : la somme des 5 dés, quelle que soit la combinaison.",
    "Gagnant : le score total le plus haut.",
  ],
  ascenseur: [
    "Le nombre de tours dépend du nombre de joueurs : montée de 1 carte à un max (52 ÷ nb joueurs), un palier au max sans atout, puis descente jusqu'à 1.",
    "Chaque tour, tout le monde annonce un pari (nombre de plis visés) avant de jouer, puis le réalisé une fois le tour terminé.",
    "La somme de tous les paris ne peut jamais être égale au nombre de cartes du tour — le dernier à annoncer doit en tenir compte.",
    "L'ordre d'annonce tourne d'un cran à chaque tour (le premier devient dernier, etc.) — personne n'est désavantagé deux fois de suite.",
    "Contrat tenu (pari = réalisé) : 10 pts + 5 pts par pli réalisé. Contrat manqué : -5 pts par pli d'écart (au-dessus ou en dessous).",
    "Gagnant : le score total le plus haut.",
  ],
  uno: [
    "Seul celui qui vide sa main marque des points à chaque tour : il récupère la somme des cartes restant dans la main de TOUS les autres (les autres ne gagnent ni ne perdent rien ce tour-là).",
    "Valeur des cartes restantes : chiffres (0-9) = leur valeur, Skip/Reverse/+2 = 20 pts, Joker/+4 = 50 pts.",
    "Chacun tape ce qu'il lui reste en main en fin de tour ; 0 pour celui qui a gagné — le calcul se fait tout seul.",
    "Score cible réglable en haut de l'écran (500 pts par défaut, règle officielle).",
    "Gagnant : le premier à atteindre le score cible (score total le plus haut).",
  ],
  molkky: [
    "Formation de départ ci-dessus (officielle) : rangs de 1-2, 3-10-4, 5-11-12-6, puis 7-9-8 le plus loin. Après un lancer, les quilles tombées sont redressées là où elles sont tombées (jamais remises dans la formation initiale).",
    "Une seule quille tombée : on marque son numéro. Plusieurs quilles tombées d'un coup : on marque le NOMBRE de quilles tombées (pas la somme des numéros).",
    "Objectif : atteindre exactement 50 points. Un dépassement fait retomber le score à 25.",
    "3 lancers ratés d'affilée (0 point) : le joueur est éliminé pour le reste de la partie.",
    "Gagnant : le premier à atteindre exactement 50 points.",
  ],
  cornhole: [
    "2 camps (1 ou 2 joueurs chacun). Sac dans le trou = 3 pts, sac sur la planche = 1 pt.",
    "Scoring par annulation : à chaque tour, seul l'écart entre les deux camps compte. Saisis directement cet écart déjà calculé dans la case du camp qui a marqué — l'autre reste à 0.",
    "Score cible réglable en haut de l'écran (21 pts par défaut, variantes possibles en moins de points).",
    "Gagnant : le premier camp à atteindre ou dépasser le score cible.",
  ],
  le_5: [
    "But : avoir le score le plus BAS possible. De 2 joueurs à l'infini (à partir de 6, on mélange 2 jeux de cartes).",
    "Le donneur (qui tourne à chaque manche) distribue entre 4 et 6 cartes par joueur, à sa convenance.",
    "Valeur des cartes : Roi = -1, Valet/Dame = 10, autres cartes = valeur faciale. Pioche + une carte visible ; si la pioche est épuisée, on retourne la défausse sans la mélanger.",
    "À ton tour : prends la carte visible ou pioche, puis défausse une carte de ta main (comme au Skyjo).",
    "Combinaisons : paires, brelans, carrés, ou suites de 3 cartes de la même couleur.",
    "Dès que ta main vaut 5 ou moins, tu peux \"poser\" pour terminer la manche. Si tu as vraiment la main la plus faible : tu marques ta main, plafonnée à 0 (donc négatif si tu as des rois). Sinon : ta main + 30 pts de malus.",
    "Saisis directement ton score de manche déjà calculé, comme au Skyjo.",
    "La partie s'arrête dès qu'un cumul dépasse strictement 150 pts. Un cumul tombant PILE à 150 redescend à 0 pour ce joueur, qui continue à jouer.",
    "Gagnant : le score total le plus bas.",
  ],
};

export function gameRules(code: string): string[] {
  return GAME_RULES[code] ?? [];
}
