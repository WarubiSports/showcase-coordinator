-- Track whether a Futures participant has been sent their onboarding portal link.
-- Prevents accidental re-sends when toggling Confirm Spot off/on, and lets the UI
-- show whether they've received their travel-info form yet.

ALTER TABLE trial_prospects
  ADD COLUMN IF NOT EXISTS portal_link_sent_at timestamptz;
