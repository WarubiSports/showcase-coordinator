'use client'

import { createContext, useContext } from 'react'
import type { StaffIdentity } from '@/lib/staff-session'

// What the server already knows about the signed-in staff member when the page is rendered: the identity, null
// for the basic-auth login, undefined where no layout resolved it (the shell then asks /api/admin/me first).
const InitialStaffContext = createContext<StaffIdentity | null | undefined>(undefined)

export const InitialStaffProvider = ({ value, children }: { value: StaffIdentity | null; children: React.ReactNode }) => (
  <InitialStaffContext.Provider value={value}>{children}</InitialStaffContext.Provider>
)

export const useInitialStaff = () => useContext(InitialStaffContext)
