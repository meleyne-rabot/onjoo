-- ============================================================
-- Code court pour rejoindre une ligue (alternative au lien d'invitation,
-- qui repose sur navigator.clipboard et échouait pour certains membres —
-- un code à recopier à la main fonctionne toujours).
-- ============================================================

alter table leagues add column join_code text;

create function generate_league_join_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

-- Backfill des ligues existantes, avec quelques essais en cas de collision
-- improbable (36^6 combinaisons, largement assez pour le nombre de ligues).
do $$
declare
  league_row record;
  candidate text;
  attempts int;
begin
  for league_row in select id from leagues where join_code is null loop
    attempts := 0;
    loop
      candidate := generate_league_join_code();
      attempts := attempts + 1;
      exit when not exists (select 1 from leagues where join_code = candidate);
      exit when attempts > 20;
    end loop;
    update leagues set join_code = candidate where id = league_row.id;
  end loop;
end $$;

alter table leagues alter column join_code set not null;
alter table leagues add constraint leagues_join_code_unique unique (join_code);

-- create_league génère désormais aussi le join_code (avec la même
-- logique de retry en cas de collision).
create or replace function create_league(league_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league_id uuid;
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := generate_league_join_code();
    attempts := attempts + 1;
    exit when not exists (select 1 from leagues where join_code = candidate);
    if attempts > 20 then
      raise exception 'could_not_generate_join_code';
    end if;
  end loop;

  insert into leagues (name, created_by, join_code)
  values (league_name, auth.uid(), candidate)
  returning id into new_league_id;

  return new_league_id;
end;
$$;

-- ============================================================
-- RPC : rejoindre une ligue via son code court
-- ============================================================

create function join_league_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league_id uuid;
begin
  select id into target_league_id from leagues where join_code = upper(trim(code));

  if target_league_id is null then
    raise exception 'invalid_join_code';
  end if;

  insert into league_members (league_id, user_id, role)
  values (target_league_id, auth.uid(), 'member')
  on conflict (league_id, user_id) do nothing;

  return target_league_id;
end;
$$;
