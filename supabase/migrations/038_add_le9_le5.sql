-- Onjoo — ajoute "Le 9" et "Le 5" en "bientôt disponible" (jeux maison,
-- règles pas encore reçues)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque.

insert into games (code, name, active) values
  ('le_9', 'Le 9', false),
  ('le_5', 'Le 5', false)
on conflict (code) do update set active = excluded.active;
