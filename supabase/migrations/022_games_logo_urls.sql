-- Onjoo — renseigne les logos officiels reçus (Flip 7, Qwirkle, Skyjo, Uno)
-- À coller dans l'éditeur SQL du dashboard Supabase (SQL Editor → New query → Run)

update games set logo_url = '/games/flip7.webp' where code = 'flip7';
update games set logo_url = '/games/qwirkle.webp' where code = 'qwirkle';
update games set logo_url = '/games/skyjo.jpg' where code = 'skyjo';
update games set logo_url = '/games/uno.png' where code = 'uno';
