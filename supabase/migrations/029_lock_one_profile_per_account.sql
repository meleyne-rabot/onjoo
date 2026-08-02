-- Onjoo — profil joueur global, étape 2/2 : verrouille "un seul profil par
-- compte" et nettoie les colonnes devenues obsolètes sur players.
-- À NE LANCER QU'APRÈS avoir fusionné tous les doublons existants (page
-- Joueurs → bouton ⇄, fonctionne maintenant entre deux ligues différentes).
--
-- Vérifie d'abord qu'il n'en reste aucun avec cette requête (doit renvoyer
-- 0 ligne) :
--
--   select linked_user_id, count(*)
--   from players
--   where linked_user_id is not null
--   group by linked_user_id
--   having count(*) > 1;
--
-- Si elle renvoie des lignes, il reste des comptes en double : refais-les
-- fusionner avant de lancer ce script (sinon la contrainte plus bas
-- échouera, sans rien casser — juste une erreur bloquante, aucune donnée
-- perdue).

begin;

alter table players drop constraint if exists players_one_per_user_per_league;
alter table players add constraint players_one_per_linked_user unique (linked_user_id);

alter table players drop column if exists league_id;
alter table players drop column if exists archived;

drop index if exists players_league_id_idx;

commit;
