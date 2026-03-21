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

## Tech Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 4
- **Database:** Supabase (PostgreSQL)
- **Drag-drop:** @dnd-kit
- **Deploy:** Vercel

## IMPORTANT: Separate Supabase Project
This app uses Supabase project `bdyiyeypkajxzhkefcyv` — **NOT** the shared ITP project (`umblyhwumtadlvgccdwg`).

## Key Directories
- `/src/app/` - Next.js App Router pages
- `/src/components/` - Feature-organized components + shadcn/ui
- `/src/contexts/` - EventContext (current event selection + multi-event support)
- `/src/hooks/` - Data hooks (use-tasks, use-categories, use-players, use-attendees, use-user, use-events)
- `/src/lib/` - Supabase client, constants, utils
- `/src/types/` - TypeScript types + Supabase database types
- `/supabase/migrations/` - Migration files
- `/scripts/` - Utility scripts

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
| `/event/[slug]` | Public event page (slug-locked) |

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
- Venue zones + rotation tables

## Hook Pattern (example: use-tasks.ts)
- Fetch from Supabase with category joins
- Support filtering: category, status, priority, assignee, search
- CRUD methods returned from hook
- Activity logging on create/update

## Auth
No authentication. User identified by name stored in localStorage (`SHOWCASE_USER_NAME`).

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
