export type Locale = 'ar' | 'en'
export type Direction = 'rtl' | 'ltr'

export interface LocaleState {
  locale: Locale
  direction: Direction
  _hasHydrated: boolean
  setLocale: (locale: Locale) => void
  setHasHydrated: (hasHydrated: boolean) => void
}
