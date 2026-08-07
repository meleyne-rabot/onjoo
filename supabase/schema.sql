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
  -- Code court à recopier à la main : alternative au lien d'invitation,
  -- qui dépend de navigator.clipboard et échoue silencieusement pour
  -- certains membres.
  join_code text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table league_members (
  league_id uuid not null references leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 'observer' : accès support à la ligue (RLS complète) sans jamais
  -- devenir un joueur visible — pas de fiche `players` associée.
  role text not null default 'member' check (role in ('admin', 'member', 'observer')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

-- players est une identité GLOBALE par compte : un joueur avec compte n'a
-- qu'une seule fiche, partagée entre toutes ses ligues (linked_user_id
-- unique tous comptes confondus). Un invité (is_guest, linked_user_id null)
-- reste local à la ligue où il a été créé — pas d'identité à partager.
-- league_players fait le lien "quel joueur participe à quelle ligue" ;
-- avant cette table, players.league_id jouait ce rôle et forçait une
-- nouvelle fiche (donc un nouvel historique séparé) à chaque nouvelle
-- ligue rejointe par un même compte.
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_color text not null,
  avatar_shape text not null,
  is_guest boolean not null default false,
  linked_user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  constraint players_one_per_linked_user unique (linked_user_id)
);

create table league_players (
  league_id uuid not null references leagues (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  -- Par ligue : un joueur peut être actif dans une ligue et archivé dans
  -- une autre, ça n'a rien à voir avec son identité globale.
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (league_id, player_id)
);

create table games (
  code text primary key,
  name text not null,
  active boolean not null default false,
  -- Logo officiel du jeu (PNG détouré), affiché à côté de l'icône de
  -- catégorie sur "Nos jeux" — null tant qu'aucun logo n'a été fourni.
  logo_url text
);

-- Jeux désactivés par ligue : actif par défaut pour toutes (catalogue
-- global inchangé), une ligue ne stocke que les exceptions qu'elle a
-- explicitement désactivées (ex. une ligue ne possède pas Harmonie).
create table league_games_disabled (
  league_id uuid not null references leagues (id) on delete cascade,
  game_code text not null references games (code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (league_id, game_code)
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
  created_at timestamptz not null default now(),
  -- Réglages propres à CETTE partie (ex. score cible au Uno) — par
  -- opposition à une règle de ligue, certains réglages varient d'une
  -- partie à l'autre selon l'envie du soir.
  settings jsonb not null default '{}'::jsonb
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
create index league_players_league_id_idx on league_players (league_id);
create index league_players_player_id_idx on league_players (player_id);
create index matches_league_id_idx on matches (league_id);
create index match_players_match_id_idx on match_players (match_id);

-- ============================================================
-- Seed games (Qwirkle actif, les autres visibles "bientôt")
-- ============================================================

insert into games (code, name, active) values
  ('qwirkle', 'Qwirkle', true),
  ('uno', 'Uno', true),
  ('flip7', 'Flip 7', true),
  ('ascenseur', 'Ascenseur', true),
  ('skyjo', 'Skyjo', true),
  ('yams', 'Yam''s', true),
  ('tarot', 'Tarot', false),
  ('belote', 'Belote', false),
  ('harmonie', 'Harmonie', false),
  ('six_qui_prend', '6 qui prend', false),
  ('molkky', 'Mölkky', true),
  ('cornhole', 'Cornhole', true);

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

create function generate_league_join_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

create function create_league(league_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league_id uuid;
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := generate_league_join_code();
    attempts := attempts + 1;
    exit when not exists (select 1 from leagues where join_code = candidate);
    if attempts > 20 then
      raise exception 'could_not_generate_join_code';
    end if;
  end loop;

  insert into leagues (name, created_by, join_code)
  values (league_name, auth.uid(), candidate)
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
-- RPC : rejoindre une ligue via son code court
-- ============================================================

create function join_league_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league_id uuid;
begin
  select id into target_league_id from leagues where join_code = upper(trim(code));

  if target_league_id is null then
    raise exception 'invalid_join_code';
  end if;

  insert into league_members (league_id, user_id, role)
  values (target_league_id, auth.uid(), 'member')
  on conflict (league_id, user_id) do nothing;

  return target_league_id;
end;
$$;

-- ============================================================
-- RPC : ajouter un joueur déjà vu dans une autre de tes ligues à la
-- ligue active, sans passer par le lien d'invitation
-- ============================================================

-- Les joueurs étant désormais une identité globale (cf. players/
-- league_players plus haut), "ajouter un joueur déjà connu" ne recrée
-- plus jamais de fiche : ça se limite à rattacher son id existant à la
-- ligue cible (+ league_members si compte lié).
create function add_existing_player_to_league(p_target_league_id uuid, p_source_player_id uuid)
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

  -- On ne peut rattacher que quelqu'un vu dans une ligue où on est déjà
  -- soi-même membre (pas un annuaire global de tous les joueurs Onjoo).
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

-- players : visible/modifiable si rattaché (via league_players) à une
-- ligue dont on est membre — l'identité est globale, l'accès reste
-- toujours borné à "une ligue commune". L'insert est ouvert à tout compte
-- authentifié : une fiche seule, sans rattachement league_players, n'est
-- visible de personne (y compris son créateur) tant qu'elle n'est pas
-- rattachée à une ligue via une policy league_players qui, elle, vérifie
-- bien l'appartenance.
create policy "players_select" on players
  for select using (
    id in (
      select lp.player_id from league_players lp
      join league_members lm on lm.league_id = lp.league_id
      where lm.user_id = auth.uid()
    )
  );

create policy "players_insert" on players
  for insert with check (auth.uid() is not null);

create policy "players_update" on players
  for update using (
    id in (
      select lp.player_id from league_players lp
      join league_members lm on lm.league_id = lp.league_id
      where lm.user_id = auth.uid()
    )
  );

-- league_players
create policy "league_players_select" on league_players
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "league_players_insert" on league_players
  for insert with check (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "league_players_update" on league_players
  for update using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "league_players_delete" on league_players
  for delete using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

-- games: lecture publique pour les utilisateurs authentifiés, pas d'écriture
create policy "games_select" on games
  for select to authenticated using (true);

-- league_games_disabled
alter table league_games_disabled enable row level security;

create policy "league_games_disabled_select" on league_games_disabled
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "league_games_disabled_insert" on league_games_disabled
  for insert with check (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "league_games_disabled_delete" on league_games_disabled
  for delete using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

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
