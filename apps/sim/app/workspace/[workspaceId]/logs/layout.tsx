export default function LogsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex h-full flex-1 flex-col overflow-hidden pl-[var(--sidebar-width)] rtl:pl-0 rtl:pr-[var(--sidebar-width)]'>
      {children}
    </div>
  )
}
