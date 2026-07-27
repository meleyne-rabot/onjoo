-- Onjoo — ajoute la policy RLS manquante pour UPDATE sur rounds
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
--
-- Sans elle, l'upsert de saveCell() (onConflict match_player_id,round_index)
-- échoue silencieusement dès qu'un tour existe déjà : corriger un score ou
-- confirmer/décocher un Qwirkle après coup ne faisait rien, sans erreur.

create policy "rounds_update" on rounds
  for update using (
    match_id in (
      select m.id from matches m
      join league_members lm on lm.league_id = m.league_id
      where lm.user_id = auth.uid()
    )
  );
