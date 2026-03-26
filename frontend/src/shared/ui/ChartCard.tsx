import { Card } from 'flowbite-react'
import type { ReactNode } from 'react'

type ChartCardProps = {
  title: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
  isEmpty?: boolean
  emptyMessage?: string
}

export const ChartCard = ({
  title,
  subtitle,
  footer,
  children,
  isEmpty = false,
  emptyMessage = 'No data',
}: ChartCardProps) => {
  return (
    <Card className="min-w-0 rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {footer}
      </div>
      <div className="h-52 min-w-0 md:h-60">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
