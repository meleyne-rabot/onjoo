-- Onjoo — ajoute Mölkky et Cornhole en "bientôt disponible"
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque.

insert into games (code, name, active) values
  ('molkky', 'Mölkky', false),
  ('cornhole', 'Cornhole', false)
on conflict (code) do update set active = excluded.active;
