-- Pitch-side tests of a selection game (Athletes USA Auswahl, 30.10.2026): sprint splits at 5, 10, 20, 30 m and
-- 40 yd plus the 5-0-5 agility run, two attempts each, entered by staff on /invites/tests.
-- TARGET: Warubi Core (wwomwawpxmkrykybpqok), schema itp. Additive, nullable, no policy change.
-- Broad jump reuses the existing broad_jump_1/2 (cm); the legacy sprint_1/2 (no distance) stays untouched.
-- Until this runs the page shows a banner and its inputs stay disabled; the API refuses writes with migration_pending.

alter table itp.showcase_players
  add column if not exists sprint_5m_1 numeric,
  add column if not exists sprint_5m_2 numeric,
  add column if not exists sprint_10m_1 numeric,
  add column if not exists sprint_10m_2 numeric,
  add column if not exists sprint_20m_1 numeric,
  add column if not exists sprint_20m_2 numeric,
  add column if not exists sprint_30m_1 numeric,
  add column if not exists sprint_30m_2 numeric,
  add column if not exists sprint_40yd_1 numeric,
  add column if not exists sprint_40yd_2 numeric,
  add column if not exists agility_1 numeric,
  add column if not exists agility_2 numeric;

comment on column itp.showcase_players.sprint_5m_1 is 'Sprint split at 5 m, attempt 1, seconds';
comment on column itp.showcase_players.sprint_5m_2 is 'Sprint split at 5 m, attempt 2, seconds';
comment on column itp.showcase_players.sprint_10m_1 is 'Sprint split at 10 m, attempt 1, seconds';
comment on column itp.showcase_players.sprint_10m_2 is 'Sprint split at 10 m, attempt 2, seconds';
comment on column itp.showcase_players.sprint_20m_1 is 'Sprint split at 20 m, attempt 1, seconds';
comment on column itp.showcase_players.sprint_20m_2 is 'Sprint split at 20 m, attempt 2, seconds';
comment on column itp.showcase_players.sprint_30m_1 is 'Sprint split at 30 m, attempt 1, seconds';
comment on column itp.showcase_players.sprint_30m_2 is 'Sprint split at 30 m, attempt 2, seconds';
comment on column itp.showcase_players.sprint_40yd_1 is 'Sprint split at 40 yards, attempt 1, seconds';
comment on column itp.showcase_players.sprint_40yd_2 is 'Sprint split at 40 yards, attempt 2, seconds';
comment on column itp.showcase_players.agility_1 is 'Agility 5-0-5, attempt 1, seconds';
comment on column itp.showcase_players.agility_2 is 'Agility 5-0-5, attempt 2, seconds';

-- Rollback (drops the entered values with the columns):
-- alter table itp.showcase_players
--   drop column if exists sprint_5m_1,
--   drop column if exists sprint_5m_2,
--   drop column if exists sprint_10m_1,
--   drop column if exists sprint_10m_2,
--   drop column if exists sprint_20m_1,
--   drop column if exists sprint_20m_2,
--   drop column if exists sprint_30m_1,
--   drop column if exists sprint_30m_2,
--   drop column if exists sprint_40yd_1,
--   drop column if exists sprint_40yd_2,
--   drop column if exists agility_1,
--   drop column if exists agility_2;
