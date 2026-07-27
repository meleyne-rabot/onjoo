-- Onjoo — empêche une fiche joueur en double pour le même compte dans la même ligue
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- Absente à l'origine : un double-clic ou un retry pouvait créer un doublon
-- (cf. incident de perte de données du 27/07/2026, causé par une fiche
-- orpheline en double pour le même compte). linked_user_id NULL (joueurs
-- invités) n'est pas concerné : Postgres traite chaque NULL comme distinct
-- dans une contrainte unique.

alter table players
  add constraint players_one_per_user_per_league unique (league_id, linked_user_id);
