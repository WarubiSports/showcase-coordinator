-- Profile link (FuPa or Transfermarkt) for selection invites and the player row they create.
-- TARGET: Warubi Core (wwomwawpxmkrykybpqok), schema itp, like 20261022000001_selection_invites.sql.
-- Additive only, nullable, no policy change. Apply before deploying the code that writes it.

alter table itp.showcase_invites add column if not exists profile_url text;
alter table itp.showcase_players add column if not exists profile_url text;

comment on column itp.showcase_invites.profile_url is 'FuPa or Transfermarkt profile link entered by staff with the invite; validated on write';
comment on column itp.showcase_players.profile_url is 'FuPa or Transfermarkt profile link, copied from the invite or entered by the player on accept';
