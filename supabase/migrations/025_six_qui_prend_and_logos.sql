-- Onjoo — ajoute "6 qui prend" en "bientôt disponible" + logos Harmonie et 6 qui prend
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque même si une partie a déjà été faite.

insert into games (code, name, active) values
  ('six_qui_prend', '6 qui prend', false)
on conflict (code) do update set active = excluded.active;

update games set logo_url = '/games/six_qui_prend.webp' where code = 'six_qui_prend';
update games set logo_url = '/games/harmonie.jpeg' where code = 'harmonie';
