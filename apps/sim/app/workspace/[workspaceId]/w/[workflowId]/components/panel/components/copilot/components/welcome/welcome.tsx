'use client'

import { Button } from '@/components/emcn'
import { useTranslation } from '@/hooks/use-translation'

/** Props for the Welcome component */
interface WelcomeProps {
  /** Callback when a suggested question is clicked */
  onQuestionClick?: (question: string) => void
  /** Current copilot mode ('ask' for Q&A, 'plan' for planning, 'build' for workflow building) */
  mode?: 'ask' | 'build' | 'plan'
}

/** Welcome screen displaying suggested questions based on current mode */
export function Welcome({ onQuestionClick, mode = 'ask' }: WelcomeProps) {
  const { t } = useTranslation()

  const capabilities =
    mode === 'build'
      ? [
          {
            title: t('copilot.welcome.build'),
            question: t('copilot.welcome.helpBuild'),
          },
          {
            title: t('copilot.welcome.debug'),
            question: t('copilot.welcome.helpDebug'),
          },
          {
            title: t('copilot.welcome.optimize'),
            question: t('copilot.welcome.createFast'),
          },
        ]
      : [
          {
            title: t('copilot.welcome.getStarted'),
            question: t('copilot.welcome.helpGetStarted'),
          },
          {
            title: t('copilot.welcome.discoverTools'),
            question: t('copilot.welcome.whatTools'),
          },
          {
            title: t('copilot.welcome.createWorkflow'),
            question: t('copilot.welcome.howToCreate'),
          },
        ]

  return (
    <div className='flex w-full flex-col items-center'>
      {/* Unified capability cards */}
      <div className='flex w-full flex-col items-center gap-[8px]'>
        {capabilities.map(({ title, question }, idx) => (
          <Button
            key={idx}
            variant='active'
            onClick={() => onQuestionClick?.(question)}
            className='w-full justify-start'
          >
            <div className='flex flex-col items-start'>
              <p className='font-medium'>{title}</p>
              <p className='text-[var(--text-secondary)]'>{question}</p>
            </div>
          </Button>
        ))}
      </div>

      {/* Tips */}
      <p className='pt-[12px] text-center text-[13px] text-[var(--text-secondary)]'>
        {t('copilot.welcome.tip')}
      </p>
    </div>
  )
}
