-- Invite category (signed with Athletes USA, or new) and the link to the Base athlete row.
-- TARGET: Warubi Core (wwomwawpxmkrykybpqok), schema itp, like the two migrations before it.
-- Additive only, nullable, no policy change. Apply before deploying the code that writes it.
--
-- ausa_athlete_id points at public.athletes(id) in the same project (Base, Herbert's schema). On purpose
-- no foreign key across the schema boundary: Base owns that table and must stay free to archive rows.

alter table itp.showcase_invites
  add column if not exists ausa_athlete_id uuid,
  add column if not exists category text check (category in ('signed', 'new'));

alter table itp.showcase_players
  add column if not exists ausa_athlete_id uuid,
  add column if not exists category text check (category in ('signed', 'new'));

comment on column itp.showcase_invites.ausa_athlete_id is 'public.athletes.id of the Base athlete this invite was linked to by staff (no FK on purpose)';
comment on column itp.showcase_invites.category is 'signed = already with Athletes USA (Base register or cohort, or ticked by staff); new = regional prospect';
