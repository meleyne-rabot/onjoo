-- Onjoo — renseigne les logos officiels reçus pour Mölkky et Cornhole
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

update games set logo_url = '/games/molkky.jpeg' where code = 'molkky';
update games set logo_url = '/games/cornhole.jpeg' where code = 'cornhole';
