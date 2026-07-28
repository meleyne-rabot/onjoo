-- Onjoo — ajoute le logo officiel optionnel par jeu
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

alter table games add column logo_url text;
