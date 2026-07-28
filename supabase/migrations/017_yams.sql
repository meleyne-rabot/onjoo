-- Onjoo — active le jeu Yams dans "Nos jeux"
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

insert into games (code, name, active) values ('yams', 'Yams', true)
on conflict (code) do update set active = true;
