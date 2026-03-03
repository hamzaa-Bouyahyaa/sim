'use client'

import { useEffect } from 'react'
import { useLocaleStore } from '@/stores/locale/store'

interface LocaleProviderProps {
  children: React.ReactNode
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const locale = useLocaleStore((state) => state.locale)
  const direction = useLocaleStore((state) => state.direction)
  const hasHydrated = useLocaleStore((state) => state._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    document.documentElement.lang = locale
    document.documentElement.dir = direction
  }, [locale, direction, hasHydrated])

  return <>{children}</>
}
