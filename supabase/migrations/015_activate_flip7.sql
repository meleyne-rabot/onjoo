-- Onjoo — active le jeu Flip 7 dans "Nos jeux"
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

update games set active = true where code = 'flip7';
