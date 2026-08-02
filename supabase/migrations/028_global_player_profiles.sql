-- Onjoo — profil joueur global par compte (au lieu d'une fiche par ligue)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- Étape 1/2 : additive et sûre, ne supprime ni ne fusionne rien. Crée
-- league_players (le lien "quel joueur participe à quelle ligue") et
-- bascule dessus la visibilité (RLS) — players.league_id / .archived
-- restent en place mais ne sont plus la source de vérité, pour ne rien
-- casser pendant la transition. Idempotente : peut être relancée sans
-- risque même après une exécution partielle.
--
-- Ensuite : utilise le bouton "Fusionner" (page Joueurs) pour consolider
-- les comptes qui ont aujourd'hui une fiche par ligue (ex. toi, JF) — la
-- fusion peut maintenant se faire ENTRE deux ligues différentes. Une fois
-- tous les doublons résorbés, l'étape 2/2 (migration séparée) verrouillera
-- "un seul profil par compte" avec une vraie contrainte.

begin;

create table if not exists league_players (
  league_id uuid not null references leagues (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (league_id, player_id)
);

create index if not exists league_players_league_id_idx on league_players (league_id);
create index if not exists league_players_player_id_idx on league_players (player_id);

-- Backfill 1:1 depuis l'état actuel : une ligne league_players par fiche
-- players existante, avec le même statut archivé. Ne fusionne rien.
insert into league_players (league_id, player_id, archived, created_at)
select p.league_id, p.id, p.archived, p.created_at
from players p
where not exists (
  select 1 from league_players lp
  where lp.league_id = p.league_id and lp.player_id = p.id
);

alter table players alter column league_id drop not null;

alter table league_players enable row level security;

drop policy if exists "league_players_select" on league_players;
create policy "league_players_select" on league_players
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

drop policy if exists "league_players_insert" on league_players;
create policy "league_players_insert" on league_players
  for insert with check (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

drop policy if exists "league_players_update" on league_players;
create policy "league_players_update" on league_players
  for update using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

drop policy if exists "league_players_delete" on league_players;
create policy "league_players_delete" on league_players
  for delete using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

drop policy if exists "players_select" on players;
create policy "players_select" on players
  for select using (
    id in (
      select lp.player_id from league_players lp
      join league_members lm on lm.league_id = lp.league_id
      where lm.user_id = auth.uid()
    )
  );

drop policy if exists "players_insert" on players;
create policy "players_insert" on players
  for insert with check (auth.uid() is not null);

drop policy if exists "players_update" on players;
create policy "players_update" on players
  for update using (
    id in (
      select lp.player_id from league_players lp
      join league_members lm on lm.league_id = lp.league_id
      where lm.user_id = auth.uid()
    )
  );

-- Les joueurs étant désormais une identité globale, "ajouter un joueur
-- déjà connu" ne recrée plus jamais de fiche : ça se limite à rattacher
-- son id existant à la ligue cible (+ league_members si compte lié).
create or replace function add_existing_player_to_league(p_target_league_id uuid, p_source_player_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  src_linked_user_id uuid;
begin
  if not exists (
    select 1 from league_members
    where league_id = p_target_league_id and user_id = auth.uid()
  ) then
    raise exception 'not_a_league_member';
  end if;

  select linked_user_id into src_linked_user_id from players where id = p_source_player_id;
  if not found then
    raise exception 'player_not_found';
  end if;

  if not exists (
    select 1 from league_players lp
    join league_members lm on lm.league_id = lp.league_id
    where lp.player_id = p_source_player_id and lm.user_id = auth.uid()
  ) then
    raise exception 'not_a_member_of_source_league';
  end if;

  if src_linked_user_id is not null then
    insert into league_members (league_id, user_id, role)
    values (p_target_league_id, src_linked_user_id, 'member')
    on conflict (league_id, user_id) do nothing;
  end if;

  insert into league_players (league_id, player_id)
  values (p_target_league_id, p_source_player_id)
  on conflict (league_id, player_id) do nothing;

  return p_source_player_id;
end;
$$;

commit;
