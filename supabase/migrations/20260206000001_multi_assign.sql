-- Convert responsible/referee columns from TEXT to TEXT[] for multi-assign support

-- showcase_day_activities.responsible
ALTER TABLE showcase_day_activities
  ALTER COLUMN responsible TYPE TEXT[]
  USING CASE WHEN responsible IS NOT NULL THEN ARRAY[responsible] ELSE NULL END;

-- showcase_matches.referee
ALTER TABLE showcase_matches
  ALTER COLUMN referee TYPE TEXT[]
  USING CASE WHEN referee IS NOT NULL THEN ARRAY[referee] ELSE NULL END;

-- showcase_materials.responsible
ALTER TABLE showcase_materials
  ALTER COLUMN responsible TYPE TEXT[]
  USING CASE WHEN responsible IS NOT NULL THEN ARRAY[responsible] ELSE NULL END;
