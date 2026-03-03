'use client'

import { Languages } from 'lucide-react'
import { useLocaleStore } from '@/stores/locale/store'

export function LanguageSwitcher() {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  const handleToggle = () => {
    setLocale(locale === 'ar' ? 'en' : 'ar')
  }

  return (
    <button
      type='button'
      onClick={handleToggle}
      className='group flex h-[26px] w-full items-center gap-[8px] rounded-[8px] px-[6px] text-[14px] hover:bg-[var(--surface-6)] dark:hover:bg-[var(--surface-5)]'
    >
      <Languages className='h-[14px] w-[14px] flex-shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]' />
      <span className='truncate font-medium text-[13px] text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'>
        {locale === 'ar' ? 'English' : 'العربية'}
      </span>
    </button>
  )
}
