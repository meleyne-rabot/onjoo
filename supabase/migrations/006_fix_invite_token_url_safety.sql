-- Onjoo — corrige les tokens d'invitation non compatibles URL
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- invite_token était généré en base64 standard, qui peut contenir "+" et
-- "/". Un "/" dans le token casse l'URL /join/<token> en plusieurs
-- segments de route → 404 "page not found" au clic sur le lien d'invitation.
-- Passe à une variante base64 "URL-safe" (- et _ à la place de + et /).
--
-- ATTENTION : régénère tous les tokens existants, donc tout lien
-- d'invitation déjà partagé devient invalide — renvoie le nouveau lien
-- depuis la page "Joueurs" après avoir exécuté ce script.

alter table leagues alter column invite_token
  set default replace(replace(encode(gen_random_bytes(9), 'base64'), '+', '-'), '/', '_');

update leagues
set invite_token = replace(replace(encode(gen_random_bytes(9), 'base64'), '+', '-'), '/', '_');
