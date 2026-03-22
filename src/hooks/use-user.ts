'use client'

import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'
import type { UserRole } from '@/lib/constants'

export function useUser() {
  const [userName, setUserNameState] = useState<string | null>(null)
  const [userRole, setUserRoleState] = useState<UserRole>('coach')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedName = localStorage.getItem(STORAGE_KEYS.USER_NAME)
    const storedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole | null
    setUserNameState(storedName)
    setUserRoleState(storedRole || 'coach')
    setIsLoading(false)
  }, [])

  const setUserName = useCallback((name: string) => {
    localStorage.setItem(STORAGE_KEYS.USER_NAME, name)
    setUserNameState(name)
  }, [])

  const clearUserName = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.USER_NAME)
    setUserNameState(null)
  }, [])

  const setUserRole = useCallback((role: UserRole) => {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role)
    setUserRoleState(role)
  }, [])

  const isAdmin = userRole === 'admin'

  return {
    userName,
    setUserName,
    clearUserName,
    userRole,
    setUserRole,
    isAdmin,
    isLoading,
    hasUser: Boolean(userName),
  }
}
