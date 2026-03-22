---
name: event-setup
description: Audit and populate a showcase event's public page — find missing logos, set venue data, add coaches/scouts, and deploy. Use when setting up or improving an event's public registration page.
argument-hint: [event-slug]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, mcp__plugin_supabase_supabase__execute_sql, mcp__plugin_supabase_supabase__apply_migration, WebSearch
---

# Event Page Setup

You are setting up or auditing the public event page for a Showcase Coordinator event.

## Context

- **Project:** Showcase Coordinator (`~/projects/showcase-coordinator`)
- **Supabase project ID:** `umblyhwumtadlvgccdwg`
- **Public event pages:** `/event/[slug]`
- **Live URL:** `https://showcase-coordinator.vercel.app/event/[slug]`

## Event Slug

Target event: `$ARGUMENTS`

## Step 1: Audit Current State

Query the database to check:

```sql
-- Event details
SELECT id, name, slug, location, start_date, end_date, start_time, end_time,
       description, type, venue_lat, venue_lng, price, currency,
       age_min, age_max, registration_open, registration_details, accent_color, max_players
FROM showcase_events WHERE slug = '[slug]';

-- Scouts/coaches attached
SELECT id, name, organization, logo_url, sort_order
FROM showcase_event_scouts WHERE event_id = '[event_id]'
ORDER BY sort_order;

-- Player count
SELECT count(*) FROM showcase_players WHERE event_id = '[event_id]';
```

Report what's missing or incomplete:
- [ ] Event has description/registration_details
- [ ] Event has venue_lat/venue_lng (needed for map embed)
- [ ] Event has accent_color set
- [ ] Event has price and currency
- [ ] Event has age_min/age_max
- [ ] Event has start_time/end_time
- [ ] Scouts/coaches are attached
- [ ] All scouts have logo_url populated
- [ ] Registration is open (if event is upcoming)

## Step 2: Find and Populate Missing Logos

For each scout/coach missing a `logo_url`:

1. **NCAA colleges:** Use the NCAA CDN pattern:
   `https://www.ncaa.com/sites/default/files/images/logos/schools/bgd/[school-slug].svg`
   Common slugs: `new-haven`, `long-island`, `manhattan`, `fordham`, `queens-ny`, `oneonta-st`, etc.

2. **European clubs:** Use Wikimedia Commons:
   `https://upload.wikimedia.org/wikipedia/commons/thumb/[path]/400px-[filename].png`

3. **Other organizations:** Search the web for official logo URLs.

4. **Verify** each URL actually loads (use WebFetch or Agent to check).

5. **Update** the database:
   ```sql
   UPDATE showcase_event_scouts SET logo_url = '[url]' WHERE id = '[scout_id]';
   ```

## Step 3: Populate Venue Data

If `venue_lat`/`venue_lng` are null:

1. Search for the venue address to get coordinates
2. Update the event:
   ```sql
   UPDATE showcase_events
   SET venue_lat = [lat], venue_lng = [lng]
   WHERE slug = '[slug]';
   ```

## Step 4: Add Missing Coaches/Scouts

If the user provides a list of coaches/scouts to add:

```sql
INSERT INTO showcase_event_scouts (event_id, name, organization, logo_url, sort_order)
VALUES ('[event_id]', '[name]', '[org]', '[logo_url]', [order]);
```

## Step 5: Fill Registration Details

If `registration_details` is null and the user provides event info (from a flyer, description, etc.), update it:

```sql
UPDATE showcase_events
SET registration_details = '[details]'
WHERE slug = '[slug]';
```

## Step 6: Build and Deploy

```bash
cd ~/projects/showcase-coordinator
npm run build
```

If build passes:
```bash
git add -A
git commit -m "Set up event page: [event-name]"
git push
npx vercel --prod
```

## Step 7: Report

Share the live URL and summarize what was set up:
- Logos added/updated
- Venue map enabled
- Scouts/coaches added
- Missing data that still needs attention

Live URL: `https://showcase-coordinator.vercel.app/event/[slug]`
