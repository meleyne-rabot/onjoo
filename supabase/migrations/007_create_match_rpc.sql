-- Onjoo — remplace la création de partie par une fonction RPC atomique
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- Insérer matches puis match_players en deux appels séparés laissait une
-- fenêtre où le deuxième insert pouvait échouer silencieusement (le code
-- appelant ne vérifiait pas l'erreur), laissant une partie créée mais
-- sans aucun participant — l'écran de score apparaissait vide. Tout se
-- passe maintenant dans une seule transaction atomique côté serveur.

create function create_match(
  p_league_id uuid,
  p_game_code text,
  p_player_ids uuid[],
  p_guest_names text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_match_id uuid;
  pid uuid;
  gname text;
begin
  if not exists (
    select 1 from league_members
    where league_id = p_league_id and user_id = auth.uid()
  ) then
    raise exception 'not_a_league_member';
  end if;

  insert into matches (league_id, game_code, created_by)
  values (p_league_id, p_game_code, auth.uid())
  returning id into new_match_id;

  foreach pid in array p_player_ids loop
    insert into match_players (match_id, player_id) values (new_match_id, pid);
  end loop;

  foreach gname in array p_guest_names loop
    insert into match_players (match_id, guest_name) values (new_match_id, gname);
  end loop;

  return new_match_id;
end;
$$;

-- Optionnel : supprime les parties orphelines créées par ce bug (aucun
-- participant). Vérifie d'abord avec le SELECT si tu veux voir lesquelles
-- avant de les supprimer.
-- select * from matches m where not exists (select 1 from match_players mp where mp.match_id = m.id);
-- delete from matches m where not exists (select 1 from match_players mp where mp.match_id = m.id);
