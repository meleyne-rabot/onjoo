-- ============================================================
-- Diagnostic temporaire (incident RLS players_insert) : renvoie ce que
-- Postgres voit comme auth.uid() pour LE RÔLE APPELANT (SECURITY INVOKER,
-- par défaut) — permet de vérifier si l'écart vient du SDK JS (qui voit
-- un uid valide via getUser()) ou de la requête PostgREST elle-même (qui
-- pourrait ne pas transmettre le même contexte d'auth à Postgres).
-- À supprimer une fois l'incident résolu.
-- ============================================================

create function debug_auth_uid()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;
