-- Onjoo — ajoute Skyjo à la liste des jeux
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- Remet aussi "Flip 7" au bon nom si une version précédente de ce script
-- (qui le renommait par erreur en "Flip Seven") a déjà tourné.

insert into games (code, name, active) values
  ('skyjo', 'Skyjo', false)
on conflict (code) do nothing;

update games set name = 'Flip 7' where code = 'flip7';
