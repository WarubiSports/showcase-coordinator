-- Who created an invite, taken from the Staff App login (Supabase auth on Warubi Core) instead of free text.
-- TARGET: Warubi Core (wwomwawpxmkrykybpqok), schema itp. Additive only, nullable, no policy change.
-- invited_by (free text, the WhatsApp sender name) stays; these two are set only when a staff session created the row.

alter table itp.showcase_invites
  add column if not exists invited_by_staff_id uuid,
  add column if not exists invited_by_email text;

comment on column itp.showcase_invites.invited_by_staff_id is 'auth user id of the signed-in staff member who created the invite (itp.staff_profiles.id); null when created with the basic-auth admin login';
comment on column itp.showcase_invites.invited_by_email is 'email of that staff member at creation time';
