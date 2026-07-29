-- Onjoo — ajoute des réglages propres à chaque partie (ex. score cible au Uno)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

alter table matches add column settings jsonb not null default '{}'::jsonb;
