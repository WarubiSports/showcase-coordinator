import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { STAFF_COOKIE } from '@/lib/staff-cookie'

// Staff sign-in for the invite area: the same Supabase auth users as the ITP Staff App (Warubi Core) and the
// same gate, a row in itp.staff_profiles for the auth user id. Modelled on the Staff App's
// src/lib/supabase/middleware.ts, with its own cookie so both apps can be open side by side.
// Server only. The anon key serves auth; the profile lookup uses the service role on schema itp.

export interface StaffIdentity {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

export type CookieToSet = { name: string; value: string; options?: CookieOptions }

// Auth client bound to the request's cookies; refreshed cookies are handed to the caller to put on the response
export const staffAuthClient = (req: NextRequest, onSetAll?: (cookies: CookieToSet[]) => void) =>
  createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: STAFF_COOKIE },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookies) => onSetAll?.(cookies),
    },
  })

// The signed-in staff member behind the request, or null (no session, or an auth user without a staff profile)
export const getStaffIdentity = async (req: NextRequest, onSetAll?: (cookies: CookieToSet[]) => void): Promise<StaffIdentity | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  try {
    const {
      data: { user },
    } = await staffAuthClient(req, onSetAll).auth.getUser()
    if (!user) return null
    const { data } = await createAdminClient().from('staff_profiles').select('id, full_name, email, role').eq('id', user.id).maybeSingle()
    return (data as StaffIdentity | null) ?? null
  } catch {
    return null
  }
}

export const staffFirstName = (staff: StaffIdentity | null): string => staff?.full_name?.trim().split(/\s+/)[0] ?? ''
