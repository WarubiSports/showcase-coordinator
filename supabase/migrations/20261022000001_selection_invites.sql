-- Selection game invites (Athletes USA Selection vs. ITP, 30.10.2026, and future selection formats).
--
-- TARGET: Warubi Core (wwomwawpxmkrykybpqok), schema itp. Since the ITP move (production switched on
-- 21.10.2026, deployment dpl_FRGSTxJBEuUqX4wXZudXLkpmtQLP) the app reads itp.showcase_* there; the old
-- ITP Apps project (umblyhwumtadlvgccdwg, schema public) is no longer written. Every name below is
-- schema-qualified on purpose, so running this against the old project fails instead of creating stray tables.
--
-- Additive only: a new table plus nullable columns on showcase_players. Safe to apply before the deploy.
--
-- Access model: showcase_invites holds names and phone numbers of players, many of them minors.
-- No anon or authenticated policy or grant on purpose: every read and write goes through server routes
-- with the service role (admin basic auth for staff, the unguessable token for the player). The itp schema
-- has no default privileges, so the service role grant is explicit.

create table if not exists itp.showcase_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references itp.showcase_events(id) on delete cascade,
  token text not null unique,
  name text not null,
  phone text,
  invited_by text not null,
  personal_line text,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  player_id uuid references itp.showcase_players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_showcase_invites_event on itp.showcase_invites(event_id);

alter table itp.showcase_invites enable row level security;
revoke all on table itp.showcase_invites from anon, authenticated;
grant select, insert, update, delete on table itp.showcase_invites to service_role;

-- Sign-up details collected on the invite page. All nullable; existing registrations are untouched.
alter table itp.showcase_players
  add column if not exists school_type text check (school_type in ('abitur', 'fachabitur', 'realschule', 'other')),
  add column if not exists grad_year integer,
  add column if not exists grades text,
  add column if not exists english_level text,
  add column if not exists video_url text,
  add column if not exists jersey_number integer,
  add column if not exists consent_profile_at timestamptz,
  add column if not exists consent_social_at timestamptz,
  add column if not exists consent_parent_name text,
  add column if not exists consent_ip text;

comment on column itp.showcase_players.consent_parent_name is 'Name typed under "Name der Person, die zustimmt": the player (18+) or the parent (under 18)';
comment on column itp.showcase_players.consent_profile_at is 'Consent (a): footage for the player profile and sharing with US college coaches';
comment on column itp.showcase_players.consent_social_at is 'Consent (b): social media and website, optional';
