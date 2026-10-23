import { STAFF_COOKIE } from '@/lib/staff-cookie'
import type { StaffIdentity } from '@/lib/staff-session'

// What the shell knows about the staff check: who answered, whether the check is through, whether it failed
export interface StaffCheck {
  staff: StaffIdentity | null
  loaded: boolean
  failed: boolean
}

export type MeResult = { ok: true; staff: StaffIdentity | null } | { ok: false }

// Starting point: the server's answer when a layout resolved it (null = basic-auth login), else not loaded yet
export const initialStaffCheck = (initial: StaffIdentity | null | undefined): StaffCheck =>
  initial === undefined ? { staff: null, loaded: false, failed: false } : { staff: initial, loaded: true, failed: false }

// After /api/admin/me answered (or failed for good): a failure keeps what the server said
export const afterMeResult = (prev: StaffCheck, result: MeResult): StaffCheck =>
  result.ok ? { staff: result.staff, loaded: true, failed: false } : { ...prev, loaded: true, failed: true }

// A staff session cookie in the browser (the Supabase browser client sets it readable; it may be chunked)
export const hasStaffCookie = (cookieHeader: string): boolean =>
  cookieHeader.split(';').some((c) => c.trim().startsWith(STAFF_COOKIE))

// The name dialog is for the basic-auth login only: no stored name, the check through and answered
// (not failed), no staff and no staff cookie. A staff session never sees it, however the check went.
export const shouldAskForName = ({ hasUser, check, staffCookie }: { hasUser: boolean; check: StaffCheck; staffCookie: boolean }): boolean =>
  !hasUser && check.loaded && !check.failed && !staffCookie && check.staff === null
