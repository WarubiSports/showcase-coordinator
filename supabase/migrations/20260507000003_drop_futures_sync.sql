-- Roll back the Futures→showcase-coordinator sync. Futures (and Female Camp) will
-- be coordinated entirely in Warubi Ops (ITP-Staff-App) — calendar, tasks,
-- operations, testing, prospects all already exist there. Showcase Coordinator
-- stays for actual showcases (Cologne, Shark, future US events).
--
-- Keep `trial_prospects.roster_confirmed_at` — it's now the Participants gate
-- in Warubi Ops `/futures?tab=participants`.

DROP TRIGGER IF EXISTS sync_prospect_to_showcase_player_trigger ON trial_prospects;
DROP FUNCTION IF EXISTS sync_prospect_to_showcase_player();

DELETE FROM showcase_players
WHERE event_id = (SELECT id FROM showcase_events WHERE slug = 'futures-intake-1')
  AND created_by = 'futures-trigger';

DELETE FROM showcase_events WHERE slug = 'futures-intake-1';
