-- ============================================================
-- Corrige les policies RLS de `players`, restées sur leur ancienne
-- version (basée sur players.league_id) au lieu du modèle profil global
-- via league_players introduit par la migration 028. Conséquence en
-- production : tout insert dans `players` (nouveau profil invité, ou
-- nouveau compte qui rejoint) violait la policy et échouait — "new row
-- violates row-level security policy for table players".
--
-- Idempotente : peut être relancée sans risque, remplace juste les 3
-- policies par la version correcte quel que soit leur état actuel.
-- ============================================================

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
