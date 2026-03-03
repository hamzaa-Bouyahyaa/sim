'use client'

import { useCallback, useMemo } from 'react'
import { useLocaleStore } from '@/stores/locale/store'
import type { Locale } from '@/stores/locale/types'
import arMessages from '@/messages/ar.json'
import enMessages from '@/messages/en.json'

const messages: Record<Locale, Record<string, unknown>> = {
  ar: arMessages,
  en: enMessages,
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path
    }
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : path
}

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale)
  const direction = useLocaleStore((state) => state.direction)

  const currentMessages = useMemo(() => messages[locale], [locale])

  const t = useCallback(
    (key: string): string => getNestedValue(currentMessages, key),
    [currentMessages]
  )

  return { t, locale, direction }
}
