-- Onjoo — ajoute l'ordre de jeu (qui commence) sur match_players
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

alter table match_players
  add column turn_order integer,
  add column created_at timestamptz not null default now();
