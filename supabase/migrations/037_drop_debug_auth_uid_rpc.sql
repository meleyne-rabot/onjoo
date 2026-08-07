-- Nettoyage du diagnostic temporaire (incident RLS players_insert, résolu :
-- le vrai coupable était `INSERT ... RETURNING` sur players, qui applique
-- aussi la policy SELECT à la ligne fraîchement créée — pas encore
-- rattachée via league_players à ce stade. Fix côté code : id généré
-- côté client, plus de RETURNING sur l'insert.)

drop function if exists debug_auth_uid();
