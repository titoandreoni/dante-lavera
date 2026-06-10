'use client'

import { useState, useEffect, useCallback } from 'react'

export function useUser() {
  const [userName, setUserName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('userName')
    setUserName(stored)
    setIsLoading(false)
  }, [])

  const setUser = useCallback((name: string) => {
    localStorage.setItem('userName', name)
    setUserName(name)
  }, [])

  const clearUser = useCallback(() => {
    localStorage.removeItem('userName')
    setUserName(null)
  }, [])

  // Greeting based on time of day
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'Buenos días'
    if (hour >= 12 && hour < 20) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return {
    userName,
    isLoading,
    setUser,
    clearUser,
    greeting: greeting(),
  }
}
