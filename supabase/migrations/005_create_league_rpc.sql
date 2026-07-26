-- Onjoo — remplace l'insert direct sur "leagues" par une fonction RPC
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- L'erreur "new row violates row-level security policy for table leagues"
-- vient du INSERT ... RETURNING : Postgres exige que la ligne insérée
-- passe aussi la policy de lecture leagues_select_member, qui dépend du
-- trigger on_league_created ayant déjà écrit dans league_members —
-- enchaînement fragile. La fonction ci-dessous (SECURITY DEFINER)
-- contourne ce problème en renvoyant l'id directement, sans relecture
-- soumise à RLS.

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
