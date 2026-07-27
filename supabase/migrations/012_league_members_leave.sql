-- Onjoo — permet à un membre de quitter une ligue lui-même (ex. doublon créé par erreur)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

create policy "league_members_delete_self" on league_members
  for delete using (user_id = auth.uid());
