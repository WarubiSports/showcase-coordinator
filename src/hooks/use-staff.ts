'use client'

import { useEffect, useState } from 'react'
import { createStaffBrowserClient } from '@/lib/staff-browser'
import type { StaffIdentity } from '@/lib/staff-session'

// The staff member signed in to the invite area (Staff App login), or null under the basic-auth login
export const useStaff = () => {
  const [staff, setStaff] = useState<StaffIdentity | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { staff: null }))
      .then((j: { staff?: StaffIdentity | null }) => {
        if (active) setStaff(j.staff ?? null)
      })
      .catch(() => {
        if (active) setStaff(null)
      })
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  const signOut = async () => {
    await createStaffBrowserClient().auth.signOut()
    window.location.href = '/login'
  }

  // The WhatsApp sender name defaults to the staff member's first name; still editable in the form
  const firstName = staff?.full_name?.trim().split(/\s+/)[0] ?? ''

  return { staff, loaded, firstName, signOut }
}
