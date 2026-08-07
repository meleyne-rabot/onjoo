-- ============================================================
-- Jeux désactivés par ligue : actif par défaut pour toutes les ligues
-- (catalogue global inchangé), une ligue ne stocke que les EXCEPTIONS
-- qu'elle a explicitement désactivées (ex. une ligue ne possède pas
-- Harmonie et ne veut pas le voir dans "Nos jeux" ni dans la roulette).
-- ============================================================

create table league_games_disabled (
  league_id uuid not null references leagues (id) on delete cascade,
  game_code text not null references games (code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (league_id, game_code)
);

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
