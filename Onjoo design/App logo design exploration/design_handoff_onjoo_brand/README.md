# Handoff : Charte Onjoo (logo + UI kit)

## Overview
Identité visuelle de l'app Onjoo ("on joue") — gestion de joueurs/parties/stats de jeux de société en famille. Ce dossier contient le logo validé et un premier kit UI (boutons, navigation, menus) à recréer dans le vrai codebase.

## About the Design Files
Les fichiers `.html` de ce dossier sont des **références de design** faites en HTML/CSS inline — pas du code à copier tel quel. La tâche : recréer ces designs dans l'environnement réel de l'app (React Native / React / Swift / autre — selon la stack du projet), avec les patterns déjà en place. Si l'app n'existe pas encore, choisir le framework le plus adapté (l'app étant PWA-first d'après le brief, React + PWA est un choix cohérent).

## Fidelity
**Haute fidélité (hifi)** sur les couleurs, la typographie et les formes du logo — les valeurs ci-dessous sont à reprendre exactement. Les composants UI (boutons/nav/menus) sont une première proposition de style, pas encore validés écran par écran : à affiner avec le développeur au fur et à mesure des vrais écrans.

## Logo

**Concept** : un visage souriant formé par les lettres "Onj" + deux formes de jeu — un pion rond (représentant les joueurs) et un dé arrondi à 3 points (représentant les jeux) — avec un sourire tracé en courbe fluide, légèrement de travers, partant de la pointe du "j".

**Construction** (icône carrée, ex. 176×176 sur tuile arrondie `border-radius: 40px` sur fond `#FAF1DE`) :
- "On" — Fredoka 700, 42px, couleur `#163D2E`, centré
- "j" — Fredoka 700, 58px, couleur `#E9A23B`, `margin-top: -8px`
- pion — cercle `44×44`, fond `#DE5A34`, `border-radius: 50%`, contenant une tête ronde blanche (13×13, `border-radius: 50%`) posée directement sur une base blanche trapèze (`clip-path: polygon(32% 0%, 68% 0%, 100% 100%, 0% 100%)`, 21×12, `margin-top: -2px`) — silhouette de pion simplifiée, sans "cou"
- dé — carré `44×44`, fond `#2F6FB2`, `border-radius: 16px`, 3 points blancs en diagonale (grille 3×3, points aux cases [1,1], [2,2], [3,3])
- sourire — tracé SVG (pas de bordure CSS), `viewBox="0 0 100 42"`, `path d="M4 10 Q50 42 96 2"`, `stroke="#163D2E"`, `stroke-width="9"`, `stroke-linecap="round"`, positionné `margin-left: 24px` (démarre sous la pointe du "j", remonte vers la droite)

**Wordmark** : "Onjoo" en Fredoka 700, `#163D2E` sur fond clair / blanc sur fond sombre (`#163D2E`). Logotype horizontal = icône (72×72, `border-radius: 18px`) + texte, `gap: 14px`.

**Petits formats** : à 32px et moins, garder le pion et le dé est possible mais leurs détails (3 points, silhouette du pion) deviennent flous/illisibles — au-dessus de ~40-48px ils restent lisibles et doivent être conservés ; en dessous, prévoir une version simplifiée (ex. juste le rond "O"-pion + le sourire, sans le dé) pour le favicon 16px.

## Design Tokens

Couleurs :
- `--onjoo-green-900: #163D2E` — texte principal, fonds sombres, boutons primaires
- `--onjoo-orange-500: #E9A23B` — accent (lettre "j", highlights)
- `--onjoo-red-500: #DE5A34` — accent pion, actions destructives
- `--onjoo-blue-500: #2F6FB2` — accent dé, liens/info
- `--onjoo-purple-500: #5C3A73` — accent tertiaire (peu utilisé, réserve)
- `--onjoo-sage-500: #8A9A6E` — accent tertiaire (peu utilisé, réserve)
- `--onjoo-cream-50: #FAF1DE` — fond de l'icône / surfaces claires
- Blanc `#FFFFFF` — texte sur fond sombre, fonds de cartes

Typographie :
- Titres / boutons / logo : **Fredoka** (600/700)
- Texte courant : **Quicksand** (500/600/700)

Rayons : boutons/cartes `12–16px`, icône logo `40px` (grand format) / `18px` (petit format horizontal), pastilles `999px`.

## Composants (UI kit)

Voir `OnjooUIKit.html`. Couvre :
- **Boutons** : primaire (vert plein), secondaire (contour vert), ghost (texte seul), destructif (rouge plein), désactivé
- **Barre de navigation** (web/app) : logo + liens + CTA
- **Barre d'onglets mobile** : 4 items, état actif teinté
- **Menu déroulant / liste** : items avec icône ronde/carrée, séparateur, item destructif en rouge
- **Carte** : titre, meta, badge

Hover : légère teinte de fond (`rgba(22,61,46,0.06)`) sur les items neutres, teinte rouge sur les items destructifs. Pas d'ombre portée marquée — le kit reste plat, cohérent avec le logo (formes pleines, pas de dégradés).

## Assets
Aucune image bitmap — tout est en formes CSS (cercles, trapèze `clip-path`, grille de points) + un tracé SVG pour le sourire. Pas de police custom à livrer : Fredoka et Quicksand sont des Google Fonts standards.

## Icônes de catégorie de jeu

Dans `OnjooUIKit.html`, section "Icônes de catégorie de jeu" : pastille 44px, fond `#FAF1DE`, `border-radius: 12px`, une forme/couleur d'accent par catégorie — même vocabulaire que le logo (pion, dé).
- **Cartes** (Skyjo, Flip7, Ascenseur, Uno) — deux cartes à jouer superposées, contour `#2F6FB2`
- **Tuiles** (Qwirkle) — carré tourné à 45° (losange), fond `#8A9A6E`, petit carré blanc au centre
- **Plateau** (jeux de plateau classiques) — silhouette de pion (tête ronde + base trapèze), couleur `#DE5A34`
- **Dés** (Yams) — carré `#2F6FB2` avec 5 points blancs (disposition dé classique)

## Score Qwirkle — écran de saisie en tableau

Voir `QwirkleScoreTable.html`, option **1a** retenue ("Tableau grille classique").

**Structure** : grille `44px + 3 colonnes joueurs` (largeur adaptable au nb de joueurs, scroll horizontal au-delà de 4). Header = avatar + nom par joueur sur fond `#FAF1DE`. Une ligne par tour (`T1`, `T2`…), une cellule = input numérique arrondi (`40×32`, bordure `#163D2E` sur la cellule active/en cours de saisie, `#ddd` sinon). Ligne "Total" fixée en bas, fond `#FAF1DE`, Fredoka 700.

**Comportements clés** :
- **Auto-save** : chaque saisie s'enregistre automatiquement à la validation de la cellule (pas de bouton "sauvegarder") — indicateur discret "Enregistré automatiquement" (point vert `#8A9A6E` + texte 11px) sous le tableau.
- **Ajout de tour automatique** : dès que toutes les cellules du tour en cours sont remplies, un nouveau tour (ligne) apparaît tout seul — pas de bouton "+ Ajouter un tour".
- **Qwirkle bonus (score > 12)** : dès qu'un score saisi dépasse 12, un petit toggle "Qwirkle / Non" apparaît juste sous la cellule concernée (pastille 999px, option active en fond `#163D2E`) pour préciser si c'est un Qwirkle.
- **Bonus fin de partie (+6 pts)** : au moment de "Terminer la partie", un sélecteur "Qui a terminé le plateau ?" (pastilles par joueur) permet de désigner le finisseur ; les +6 points s'ajoutent automatiquement à son total (badge orange "+6 fin" affiché sous son total dans la ligne Total).
- Pas de "cumul du jour" — uniquement le total de la partie en cours.

## Files
- `Logo.html` — copie du fichier logo (toutes les explorations + version finale en bas, section "Turn 3")
- `OnjooUIKit.html` — kit UI (couleurs, typo, boutons, nav, menus, carte, icônes de catégorie)
- `QwirkleScoreTable.html` — maquette de l'écran de saisie de score Qwirkle en tableau (option 1a retenue)
