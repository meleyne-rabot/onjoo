-- Onjoo — active Uno, ajoute Harmonie en "bientôt", et rassure sur Tarot/Belote
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque même si une partie a déjà été faite.

insert into games (code, name, active) values
  ('uno', 'Uno', true),
  ('tarot', 'Tarot', false),
  ('belote', 'Belote', false),
  ('harmonie', 'Harmonie', false)
on conflict (code) do update set active = excluded.active;
