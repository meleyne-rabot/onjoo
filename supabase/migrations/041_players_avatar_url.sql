-- Onjoo — permet une vraie photo d'avatar (ex. photo de profil Google),
-- en plus du badge couleur/forme généré qui reste le repli par défaut
-- (invités, comptes sans photo, ou simplement personne qui préfère
-- garder le badge).
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque.

alter table players add column if not exists avatar_url text;
