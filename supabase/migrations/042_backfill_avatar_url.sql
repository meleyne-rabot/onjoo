-- Onjoo — rattrape la photo Google pour les comptes créés AVANT le
-- déploiement de la photo d'avatar (capturée uniquement à la création
-- depuis migration 041) : va chercher la photo dans auth.users pour
-- chaque profil déjà lié à un compte mais sans avatar_url.
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : ne touche que les fiches encore sans photo (avatar_url is null),
-- peut être relancée sans risque.

update players p
set avatar_url = coalesce(
  u.raw_user_meta_data ->> 'avatar_url',
  u.raw_user_meta_data ->> 'picture'
)
from auth.users u
where p.linked_user_id = u.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') is not null;
