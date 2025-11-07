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
    <Card className="rounded-3xl border border-slate-200 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {footer}
      </div>
      <div className="h-36 md:h-40">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
