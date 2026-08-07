-- Onjoo — ajoute "Le 5" en "bientôt disponible" (jeu maison, règles pas
-- encore reçues). "Le 9" finalement pas déployé pour l'instant : supprimé
-- s'il avait déjà été inséré par une exécution précédente de ce fichier.
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque.

delete from games where code = 'le_9';

insert into games (code, name, active) values
  ('le_5', 'Le 5', false)
on conflict (code) do update set active = excluded.active;
