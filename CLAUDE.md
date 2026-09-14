# Showcase Coordinator

## Quick Reference

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

## Live URL
https://showcase-coordinator.vercel.app

---

## Project Overview
Multi-event coordination tool for showcases, ID camps, and clinics. Manages tasks, day-of schedules, players, attendees, and venue logistics. Supports multiple events with event switching in the header.

## Scope Boundary (decided 2026-05-07)
This app is for actual showcases (Cologne, Shark, future US events) only. Futures and Female Camp are coordinated entirely in Warubi Ops (ITP-Staff-App). A Futures→showcase_players sync trigger was built (2026-05-06) and rolled back the next day (`20260507000003_drop_futures_sync.sql`) — don't rebuild Futures features here.

## Tech Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 4
- **Database:** Supabase (PostgreSQL)
- **Drag-drop:** @dnd-kit
- **Deploy:** Vercel

## Supabase Project
This app now uses the shared Supabase project `umblyhwumtadlvgccdwg` (migrated from `bdyiyeypkajxzhkefcyv` on 2026-03-22). All showcase_* tables have RLS enabled with permissive anon policies (no auth required).

## Key Directories
- `/src/app/` - Next.js App Router pages
- `/src/components/` - Feature-organized components + shadcn/ui
- `/src/contexts/` - EventContext (current event selection + multi-event support)
- `/src/hooks/` - Data hooks (use-tasks, use-categories, use-players, use-attendees, use-user, use-events)
- `/src/lib/` - Supabase client, constants, utils
- `/src/types/` - TypeScript types + Supabase database types
- `/supabase/migrations/` - Migration files. Gotcha: because the Supabase project is shared, some migrations here (May 2026) alter tables owned by other apps (`trial_prospects`, `events`, `event_attendees`) — don't assume this folder only touches `showcase_*` tables.

## Pages
| Route | Purpose |
|-------|---------|
| `/` | Dashboard (countdown, progress, assignee workload, milestones) |
| `/tasks` | Task management (cards/kanban/table views) |
| `/tasks/[id]` | Task detail |
| `/day-view` | Event day staff schedule + venue map |
| `/attendees` | Staff, alumni, coaches, scouts |
| `/players` | Player profiles with test scores |
| `/announcements` | Team communications |
| `/feedback` | Bug/feature requests with screenshots |
| `/settings` | User/app settings |
| `/event/[slug]` | Public event page (slug-locked, with registration) |
| `/event/[slug]/manage` | Scout coordinator access to an event |
| `/api/registration-email` | Registration email API route |

## Event System
- Events stored in `showcase_events` table with start_date, end_date, location, type
- `EventContext` (`src/contexts/event-context.tsx`) manages current event selection
- Event dates derived dynamically via `getEventDays(currentEvent)` in `src/lib/constants.ts`
- Countdown uses browser local time (no hardcoded timezone)
- Single-day events auto-hide day tab selectors
- Events can be cloned from templates or past events

## Database Tables
- `showcase_events` - Event definitions (name, dates, location, type, slug)
- `showcase_tasks` - Task management with multi-assign (event-scoped)
- `showcase_categories` - Task categories (global, shared across events)
- `showcase_comments` - Task comments
- `showcase_milestones` - Event milestones
- `showcase_activity` - Activity log
- `showcase_announcements` - Team announcements (event-scoped)
- `showcase_day_groups` - Day schedule groups (event-scoped)
- `showcase_day_activities` - Day schedule activities (event-scoped)
- `showcase_matches` - Match schedule (event-scoped)
- `showcase_attendees` - People (staff/alumni/coaches/scouts, multi-role, event-scoped)
- `showcase_players` - Player profiles with physical test scores
- `showcase_event_scouts` - Scout registrations for public event pages
- `showcase_feedback` - Bug/feature requests
- `showcase_materials` - Event materials
- `showcase_venue_zones` - Venue zones (rotation is a column here, not a separate table)
- `showcase_venue_settings` - Venue configuration

## Hook Pattern
Data hooks follow `use-tasks.ts`: Supabase fetch with joins, filter support, CRUD methods, activity logging on writes.

## Auth
No authentication. User identified by name + role in localStorage (`showcase_user_name`, `showcase_user_role` — see `STORAGE_KEYS` in `src/lib/constants.ts`).

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
