'use client'

import { useEffect, useState } from 'react'
import { createStaffBrowserClient } from '@/lib/staff-browser'
import { useInitialStaff } from '@/contexts/initial-staff'
import { afterMeResult, hasStaffCookie, initialStaffCheck, type MeResult } from '@/lib/staff-state'
import type { StaffIdentity } from '@/lib/staff-session'

const RETRY_MS = 2000

const askMe = async (): Promise<MeResult> => {
  try {
    const r = await fetch('/api/admin/me', { cache: 'no-store' })
    if (!r.ok) return { ok: false }
    const j = (await r.json()) as { staff?: StaffIdentity | null }
    return { ok: true, staff: j.staff ?? null }
  } catch {
    return { ok: false }
  }
}

// The staff member signed in to the invite area (Staff App login), or null under the basic-auth login. Starts
// from what the server resolved for the page, when a layout did; /api/admin/me only refreshes that. One failed
// answer (a 401 right after the login redirect, a token refresh in flight) is asked again after two seconds.
export const useStaff = () => {
  const initial = useInitialStaff()
  const [check, setCheck] = useState(() => initialStaffCheck(initial))
  const [staffCookie] = useState(() => typeof document !== 'undefined' && hasStaffCookie(document.cookie))

  useEffect(() => {
    let active = true
    const run = async (attempt: number) => {
      const result = await askMe()
      if (!active) return
      if (!result.ok && attempt === 0) {
        setTimeout(() => run(1), RETRY_MS)
        return
      }
      setCheck((prev) => afterMeResult(prev, result))
    }
    run(0)
    return () => {
      active = false
    }
  }, [])

  const signOut = async () => {
    await createStaffBrowserClient().auth.signOut()
    window.location.href = '/login'
  }

  // The WhatsApp sender name defaults to the staff member's first name; still editable in the form
  const firstName = check.staff?.full_name?.trim().split(/\s+/)[0] ?? ''

  return { staff: check.staff, loaded: check.loaded, failed: check.failed, staffCookie, firstName, signOut }
}
