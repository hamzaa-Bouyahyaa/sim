import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Direction, Locale, LocaleState } from './types'

const LOCALE_DIRECTION: Record<Locale, Direction> = {
  ar: 'rtl',
  en: 'ltr',
} as const

export const useLocaleStore = create<LocaleState>()(
  devtools(
    persist(
      (set) => ({
        locale: 'ar',
        direction: 'rtl',
        _hasHydrated: false,
        setLocale: (locale) =>
          set({
            locale,
            direction: LOCALE_DIRECTION[locale],
          }),
        setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      }),
      {
        name: 'locale-state',
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true)
        },
        partialize: (state) => ({
          locale: state.locale,
          direction: state.direction,
        }),
      }
    ),
    { name: 'locale-store' }
  )
)
