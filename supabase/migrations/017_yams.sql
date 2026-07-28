-- Onjoo — ajoute le jeu Yams + réglages de jeu configurables par ligue
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

create table league_game_settings (
  league_id uuid not null references leagues (id) on delete cascade,
  game_code text not null references games (code),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, game_code)
);

alter table league_game_settings enable row level security;

create policy "league_game_settings_select" on league_game_settings
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "league_game_settings_insert" on league_game_settings
  for insert with check (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

create policy "league_game_settings_update" on league_game_settings
  for update using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

insert into games (code, name, active) values ('yams', 'Yams', true)
on conflict (code) do update set active = true;
