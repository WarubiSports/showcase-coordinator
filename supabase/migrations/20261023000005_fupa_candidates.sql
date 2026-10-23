-- FuPa search hits kept on an invite that has no profile link yet, until staff picks one or dismisses them.
-- TARGET: Warubi Core (wwomwawpxmkrykybpqok), schema itp. Additive, nullable, no policy change.
-- The code writes the column only when it exists (an insert naming a missing column is retried without it).

alter table itp.showcase_invites
  add column if not exists fupa_candidates jsonb;

comment on column itp.showcase_invites.fupa_candidates is 'FuPa player-search hits for this name (array of {id, name, link_url, position, image, club, club_image, level, region, district, birth_year, score}); null = not searched, [] = nothing found or dismissed by staff';
