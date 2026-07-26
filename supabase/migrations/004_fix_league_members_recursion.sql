-- Onjoo — corrige une récursion infinie dans la policy RLS de league_members
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- La policy league_members_select interrogeait league_members depuis
-- l'intérieur de sa propre condition RLS, ce qui provoque une récursion
-- infinie détectée par Postgres ("infinite recursion detected in policy
-- for relation league_members") — c'est ce qui a fait planter la création
-- de ligue. Fix standard : passer par une fonction SECURITY DEFINER qui
-- contourne RLS pour la sous-requête.

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

drop policy if exists "league_members_select" on league_members;

create policy "league_members_select" on league_members
  for select using (
    user_id = auth.uid()
    or is_league_member(league_id)
  );
