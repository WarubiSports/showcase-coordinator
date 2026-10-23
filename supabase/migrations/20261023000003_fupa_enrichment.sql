-- FuPa enrichment of a selection invite: what the player's FuPa page shows (photo, club, league, position,
-- this season's games, goals and assists), read by the server when the profile link is set or changed.
-- TARGET: Warubi Core (wwomwawpxmkrykybpqok), schema itp. Additive only, nullable, no policy change.

alter table itp.showcase_invites
  add column if not exists photo_url text,
  add column if not exists club text,
  add column if not exists league text,
  add column if not exists position text,
  add column if not exists stats jsonb,
  add column if not exists enriched_at timestamptz;

comment on column itp.showcase_invites.photo_url is 'og:image of the FuPa page (the photo FuPa shows), same source the Athletes USA portal uses';
comment on column itp.showcase_invites.stats is 'Current season from the FuPa page: {season, games, goals, assists, team, league}; null when the page had none';
comment on column itp.showcase_invites.enriched_at is 'When the FuPa page was last read successfully; null = never or failed (nothing shown)';
