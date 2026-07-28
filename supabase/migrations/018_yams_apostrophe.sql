-- Onjoo — renomme "Yams" en "Yam's" (déjà écrit avec l'apostrophe dans le jeu)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

update games set name = 'Yam''s' where code = 'yams';
