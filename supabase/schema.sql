-- Onjoo — schéma initial
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

create extension if not exists "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_token text not null unique default replace(replace(encode(gen_random_bytes(9), 'base64'), '+', '-'), '/', '_'),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table league_members (
  league_id uuid not null references leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  name text not null,
  avatar_color text not null,
  avatar_shape text not null,
  is_guest boolean not null default false,
  linked_user_id uuid references auth.users (id),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  -- Un compte ne peut avoir qu'une seule fiche par ligue (linked_user_id
  -- NULL, ie. les invités, ne sont pas concernés par cette contrainte).
  -- Absente à l'origine : un double-clic ou un retry pouvait créer un
  -- doublon, cf. incident du 27/07/2026.
  constraint players_one_per_user_per_league unique (league_id, linked_user_id)
);

create table games (
  code text primary key,
  name text not null,
  active boolean not null default false
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  game_code text not null references games (code),
  played_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  imported_from_paper boolean not null default false,
  notes text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- match_players identifie un participant d'une partie : soit un joueur du
-- roster (player_id), soit un invité éphémère saisi juste pour cette partie
-- (guest_name, aucune fiche players créée, pas de stats accumulées).
create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  player_id uuid references players (id) on delete cascade,
  guest_name text,
  final_score integer,
  is_winner boolean not null default false,
  -- true si ce joueur a vidé son chevalet en premier (bonus +6 en fin de
  -- partie, cf. section 4 du spec Qwirkle).
  finished_board boolean not null default false,
  -- Ordre de jeu (0 = commence), choisi via "Qui commence ?" en début de
  -- partie. Nul tant que ce n'est pas encore choisi.
  turn_order integer,
  created_at timestamptz not null default now(),
  constraint match_players_player_or_guest check (
    (player_id is not null and guest_name is null) or
    (player_id is null and guest_name is not null)
  )
);

-- rounds référence match_players (pas players directement) : un joueur
-- éphémère n'a pas de ligne players, mais a toujours une ligne match_players
-- pour cette partie. unique(match_player_id, round_index) permet un upsert
-- propre : chaque cellule du tableau de score se sauvegarde indépendamment
-- à la saisie, sans dupliquer de ligne si le joueur corrige sa valeur.
create table rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  match_player_id uuid not null references match_players (id) on delete cascade,
  round_index integer not null,
  detail jsonb not null default '{}'::jsonb,
  points integer not null,
  created_at timestamptz not null default now(),
  unique (match_player_id, round_index)
);

create index rounds_match_id_idx on rounds (match_id);
create index rounds_match_player_id_idx on rounds (match_player_id);
create index players_league_id_idx on players (league_id);
create index matches_league_id_idx on matches (league_id);
create index match_players_match_id_idx on match_players (match_id);

-- ============================================================
-- Seed games (Qwirkle actif, les autres visibles "bientôt")
-- ============================================================

insert into games (code, name, active) values
  ('qwirkle', 'Qwirkle', true),
  ('uno', 'Uno', false),
  ('flip7', 'Flip 7', true),
  ('ascenseur', 'Ascenseur', false),
  ('skyjo', 'Skyjo', true),
  ('yams', 'Yam''s', true);

-- ============================================================
-- Trigger : le créateur d'une ligue en devient admin automatiquement
-- ============================================================

create function handle_new_league()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into league_members (league_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_league_created
  after insert on leagues
  for each row execute function handle_new_league();

-- ============================================================
-- RPC : créer une ligue
-- ============================================================
-- Évite de dépendre d'un INSERT ... RETURNING côté client, qui exige que
-- la ligne passe aussi la policy de lecture leagues_select_member —
-- laquelle dépend du trigger ci-dessus ayant déjà écrit dans
-- league_members. En SECURITY DEFINER, la fonction contourne cette
-- dépendance et renvoie directement l'id.

create function create_league(league_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league_id uuid;
begin
  insert into leagues (name, created_by)
  values (league_name, auth.uid())
  returning id into new_league_id;

  return new_league_id;
end;
$$;

-- ============================================================
-- RPC : créer une partie avec ses participants
-- ============================================================
-- Même raison que create_league : insérer matches puis match_players en
-- deux appels séparés laisse une fenêtre où le deuxième insert peut
-- échouer silencieusement (RLS ou autre) sans que le code appelant le
-- détecte, laissant une partie orpheline sans participants. Ici tout se
-- passe dans une seule transaction atomique, côté serveur.

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

-- ============================================================
-- RPC : rejoindre une ligue via son token d'invitation
-- ============================================================

create function join_league_by_token(token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league_id uuid;
begin
  select id into target_league_id from leagues where invite_token = token;

  if target_league_id is null then
    raise exception 'invalid_invite_token';
  end if;

  insert into league_members (league_id, user_id, role)
  values (target_league_id, auth.uid(), 'member')
  on conflict (league_id, user_id) do nothing;

  return target_league_id;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table leagues enable row level security;
alter table league_members enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table rounds enable row level security;

-- leagues: visible aux membres ; création par tout utilisateur authentifié (devient admin via trigger)
create policy "leagues_select_member" on leagues
  for select using (
    id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "leagues_insert_self" on leagues
  for insert with check (created_by = auth.uid());

create policy "leagues_update_member" on leagues
  for update using (
    id in (select league_id from league_members where user_id = auth.uid())
  );

-- league_members: visible si on est soi-même le membre, ou membre de la même ligue.
-- Passe par une fonction SECURITY DEFINER pour la sous-requête : une policy
-- qui interroge sa propre table directement provoque une récursion infinie
-- ("infinite recursion detected in policy for relation league_members").
create function is_league_member(target_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from league_members
    where league_id = target_league_id and user_id = auth.uid()
  );
$$;

create policy "league_members_select" on league_members
  for select using (
    user_id = auth.uid()
    or is_league_member(league_id)
  );

-- pas de policy insert/update directe : passe par le trigger (création) ou le RPC join_league_by_token (SECURITY DEFINER)

-- delete : un membre peut quitter une ligue lui-même (ex. doublon créé par erreur)
create policy "league_members_delete_self" on league_members
  for delete using (user_id = auth.uid());

-- players
create policy "players_select" on players
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "players_insert" on players
  for insert with check (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "players_update" on players
  for update using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

-- games: lecture publique pour les utilisateurs authentifiés, pas d'écriture
create policy "games_select" on games
  for select to authenticated using (true);

-- matches
create policy "matches_select" on matches
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "matches_insert" on matches
  for insert with check (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "matches_update" on matches
  for update using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

-- delete : uniquement une partie en cours (permet d'annuler un test sans
-- polluer les stats), jamais une partie déjà terminée.
create policy "matches_delete_in_progress" on matches
  for delete using (
    status = 'in_progress'
    and league_id in (select league_id from league_members where user_id = auth.uid())
  );

-- match_players
create policy "match_players_select" on match_players
  for select using (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );

create policy "match_players_insert" on match_players
  for insert with check (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );

create policy "match_players_update" on match_players
  for update using (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );

-- rounds
create policy "rounds_select" on rounds
  for select using (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );

create policy "rounds_insert" on rounds
  for insert with check (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );

create policy "rounds_delete" on rounds
  for delete using (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );

-- Manquait à l'origine : sans policy update, l'upsert de saveCell()
-- (onConflict match_player_id,round_index) échoue silencieusement dès
-- qu'un tour existe déjà — correction de score ou toggle Qwirkle après
-- coup restaient sans effet, sans erreur visible.
create policy "rounds_update" on rounds
  for update using (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Realtime : activer les mises à jour live sur rounds
-- ============================================================

alter publication supabase_realtime add table rounds;
