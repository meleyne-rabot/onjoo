-- Onjoo — ajoute un joueur déjà connu (vu dans une autre de tes ligues) à la
-- ligue active, sans passer par le lien d'invitation.
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

create function add_existing_player_to_league(p_target_league_id uuid, p_source_player_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  src record;
  new_player_id uuid;
begin
  if not exists (
    select 1 from league_members
    where league_id = p_target_league_id and user_id = auth.uid()
  ) then
    raise exception 'not_a_league_member';
  end if;

  select name, avatar_color, avatar_shape, is_guest, linked_user_id, league_id
  into src
  from players
  where id = p_source_player_id;

  if src is null then
    raise exception 'player_not_found';
  end if;

  -- On ne peut ajouter que quelqu'un vu dans une ligue où on est déjà soi-même
  -- membre (pas un annuaire global de tous les joueurs Onjoo).
  if not exists (
    select 1 from league_members
    where league_id = src.league_id and user_id = auth.uid()
  ) then
    raise exception 'not_a_member_of_source_league';
  end if;

  if src.linked_user_id is not null then
    insert into league_members (league_id, user_id, role)
    values (p_target_league_id, src.linked_user_id, 'member')
    on conflict (league_id, user_id) do nothing;

    -- Déjà une fiche pour ce compte dans la ligue cible ? On la renvoie
    -- plutôt que d'en créer une deuxième (violerait de toute façon la
    -- contrainte players_one_per_user_per_league).
    select id into new_player_id
    from players
    where league_id = p_target_league_id and linked_user_id = src.linked_user_id;

    if new_player_id is not null then
      return new_player_id;
    end if;
  end if;

  insert into players (league_id, name, avatar_color, avatar_shape, is_guest, linked_user_id)
  values (p_target_league_id, src.name, src.avatar_color, src.avatar_shape, src.is_guest, src.linked_user_id)
  returning id into new_player_id;

  return new_player_id;
end;
$$;
