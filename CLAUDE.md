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
Internal coordination tool for the **College Pro Showcase Germany** event (Feb 7-8, 2026 in Cologne). Manages tasks, schedules, players, attendees, and venue logistics. No authentication — uses localStorage for user names.

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
- `/src/hooks/` - Data hooks (use-tasks, use-categories, use-players, use-attendees, use-user)
- `/src/lib/` - Supabase client, constants, utils
- `/src/types/` - TypeScript types + Supabase database types
- `/supabase/migrations/` - 12 migration files
- `/scripts/` - Utility scripts

## Pages
| Route | Purpose |
|-------|---------|
| `/` | Dashboard (countdown, progress, assignee workload, milestones) |
| `/tasks` | Task management (cards/kanban/table views) |
| `/tasks/[id]` | Task detail |
| `/schedule` | Event schedule |
| `/day-view` | Daily activity timeline |
| `/attendees` | Staff, alumni, coaches, scouts |
| `/players` | Player profiles with test scores |
| `/announcements` | Team communications |
| `/feedback` | Bug/feature requests with screenshots |

## Event Config (src/lib/constants.ts)
- `EVENT_DATE`: 2026-02-07T09:00:00+01:00
- `EVENT_END_DATE`: 2026-02-08T18:00:00+01:00
- `EVENT_LOCATION`: Cologne, Germany

## Database Tables
- `showcase_tasks` - Task management with multi-assign
- `showcase_categories` - Task categories
- `showcase_comments` - Task comments
- `showcase_milestones` - Event milestones
- `showcase_activity` - Activity log
- `showcase_announcements` - Team announcements
- `showcase_schedule` - Event schedule
- `showcase_attendees` - People (staff/alumni/coaches/scouts, multi-role)
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
