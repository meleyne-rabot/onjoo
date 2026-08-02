-- Onjoo — ajoute le rôle "observer" (accès support à une ligue sans jamais
-- apparaître comme joueur) et t'y ajoute pour Famille Rabot (Batz) + MouneJF.
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancée sans risque.

alter table league_members drop constraint if exists league_members_role_check;
alter table league_members add constraint league_members_role_check
  check (role in ('admin', 'member', 'observer'));

insert into league_members (league_id, user_id, role)
select l.id, u.id, 'observer'
from leagues l, auth.users u
where l.name in ('Famille Rabot (Batz)', 'MouneJF')
  and u.email = 'meleyne@gmail.com'
on conflict (league_id, user_id) do update set role = 'observer';
