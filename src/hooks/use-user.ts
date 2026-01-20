'use client'

import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'

export function useUser() {
  const [userName, setUserNameState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedName = localStorage.getItem(STORAGE_KEYS.USER_NAME)
    setUserNameState(storedName)
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

  return {
    userName,
    setUserName,
    clearUserName,
    isLoading,
    hasUser: Boolean(userName),
  }
}
