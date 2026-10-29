import { NextRequest, NextResponse } from 'next/server'
import { adminAuthError } from '@/lib/admin-auth'
import { getStaffIdentity, type StaffIdentity } from '@/lib/staff-session'

// Gate of the invite area routes: the existing admin basic auth OR a staff session (Staff App login).
// Lives next to admin-auth.ts rather than inside it, because the ITP-move tests load admin-auth.ts with
// only next/server mocked (tests/itp-move-admin-route.test.mjs) and /api/admin/db keeps basic auth only.
export interface AdminOrStaffAuth {
  denied: NextResponse | null
  // Set only for a staff session; basic auth carries no identity
  staff: StaffIdentity | null
}

export const adminOrStaffAuth = async (req: NextRequest): Promise<AdminOrStaffAuth> => {
  if (!adminAuthError(req)) return { denied: null, staff: null }
  const staff = await getStaffIdentity(req)
  if (staff) return { denied: null, staff }
  return { denied: NextResponse.json({ error: 'Authentication required' }, { status: 401 }), staff: null }
}

// The same gate, but a staff session wins over Basic credentials the browser may also send: for routes that write
// under the signed-in person's name (evaluations). Basic credentials alone still read, without a name.
export const staffFirstAuth = async (req: NextRequest): Promise<AdminOrStaffAuth> => {
  const staff = await getStaffIdentity(req)
  if (staff) return { denied: null, staff }
  if (!adminAuthError(req)) return { denied: null, staff: null }
  return { denied: NextResponse.json({ error: 'Authentication required' }, { status: 401 }), staff: null }
}
