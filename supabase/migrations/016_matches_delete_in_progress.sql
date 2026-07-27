-- Onjoo — permet d'annuler (supprimer) une partie en cours, jamais une partie terminée
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

create policy "matches_delete_in_progress" on matches
  for delete using (
    status = 'in_progress'
    and league_id in (select league_id from league_members where user_id = auth.uid())
  );
