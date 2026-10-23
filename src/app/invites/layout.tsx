import { cookies } from 'next/headers'
import { getStaffIdentityFromCookies } from '@/lib/staff-session'
import { InitialStaffProvider } from '@/contexts/initial-staff'

// The invite area knows who is signed in before the first paint: the staff identity is resolved here on the
// server and handed to the shell, so the name dialog never has to guess from a client request that may fail
// once right after the login redirect (Marvin, 23.10).
export default async function InvitesLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffIdentityFromCookies(await cookies())
  return <InitialStaffProvider value={staff}>{children}</InitialStaffProvider>
}
