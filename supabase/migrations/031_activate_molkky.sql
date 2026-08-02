-- Onjoo — active Mölkky (Cornhole reste "bientôt disponible" pour l'instant)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque.

update games set active = true where code = 'molkky';
