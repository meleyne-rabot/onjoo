-- Onjoo — active "Le 5" (jeu de cartes maison), désormais implémenté
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque.

update games set active = true where code = 'le_5';
