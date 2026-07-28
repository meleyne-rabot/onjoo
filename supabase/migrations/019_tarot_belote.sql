-- Onjoo — ajoute Tarot et Belote comme jeux "bientôt disponible"
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

insert into games (code, name, active) values
  ('tarot', 'Tarot', false),
  ('belote', 'Belote', false)
on conflict (code) do nothing;
