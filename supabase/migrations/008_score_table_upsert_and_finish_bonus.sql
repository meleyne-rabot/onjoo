-- Onjoo — support du tableau de score (saisie par cellule) et du bonus fin de partie
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

alter table match_players
  add column finished_board boolean not null default false;

alter table rounds
  add constraint rounds_match_player_round_unique unique (match_player_id, round_index);
