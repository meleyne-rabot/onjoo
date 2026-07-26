-- Onjoo — migration addendum : joueurs invités (durables et éphémères)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- Recrée match_players et rounds avec le nouveau schéma qui distingue :
--   - un joueur du roster (match_players.player_id)
--   - un invité éphémère saisi juste pour cette partie (match_players.guest_name,
--     aucune fiche players créée)
-- rounds référence désormais match_players.id plutôt que players.id, pour
-- pouvoir enregistrer les tours d'un joueur éphémère qui n'a pas de fiche.
--
-- ATTENTION : ceci supprime le contenu actuel de match_players et rounds.
-- À n'exécuter que si aucune vraie partie n'a encore été saisie (confirmé).

drop table if exists rounds;
drop table if exists match_players;

create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  player_id uuid references players (id) on delete cascade,
  guest_name text,
  final_score integer,
  is_winner boolean not null default false,
  constraint match_players_player_or_guest check (
    (player_id is not null and guest_name is null) or
    (player_id is null and guest_name is not null)
  )
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  match_player_id uuid not null references match_players (id) on delete cascade,
  round_index integer not null,
  detail jsonb not null default '{}'::jsonb,
  points integer not null,
  created_at timestamptz not null default now()
);

create index match_players_match_id_idx on match_players (match_id);
create index rounds_match_id_idx on rounds (match_id);
create index rounds_match_player_id_idx on rounds (match_player_id);

alter table match_players enable row level security;
alter table rounds enable row level security;

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

alter publication supabase_realtime add table rounds;
