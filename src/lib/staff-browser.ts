'use client'

import { createBrowserClient } from '@supabase/ssr'
import { STAFF_COOKIE } from '@/lib/staff-cookie'

// Browser auth client for the login page and the sign-out control (anon key, cookie shared with the server helpers)
export const createStaffBrowserClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: STAFF_COOKIE },
  })
