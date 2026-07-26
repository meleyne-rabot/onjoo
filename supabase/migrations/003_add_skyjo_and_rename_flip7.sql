-- Onjoo — ajoute Skyjo à la liste des jeux et renomme "Flip 7" en "Flip Seven"
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

insert into games (code, name, active) values
  ('skyjo', 'Skyjo', false)
on conflict (code) do nothing;

update games set name = 'Flip Seven' where code = 'flip7';
