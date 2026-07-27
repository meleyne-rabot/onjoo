-- Onjoo — ajoute la policy RLS UPDATE manquante sur leagues (renommer une ligue)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

create policy "leagues_update_member" on leagues
  for update using (
    id in (select league_id from league_members where user_id = auth.uid())
  );
