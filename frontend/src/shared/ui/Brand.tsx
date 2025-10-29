import type { HTMLAttributes } from 'react'
import { alpha, palette } from '../../theme/palette'

type BrandProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
  subtitle?: string
}

export const Brand = ({ className, orientation = 'horizontal', subtitle, ...rest }: BrandProps) => {
  const containerClasses = [
    'flex items-center gap-3',
    orientation === 'vertical' ? 'flex-col items-start text-left' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} {...rest}>
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-[0_12px_28px_rgba(31,111,74,0.35)]"
        style={{ background: `linear-gradient(135deg, ${palette.evergreen} 0%, ${alpha(palette.moss, 0.9)} 100%)` }}
        aria-hidden="true"
      >
        TG
      </div>
      <div className={orientation === 'vertical' ? 'space-y-1' : ''}>
        <span className="block text-base font-semibold text-[color:var(--color-evergreen)]">Tiny Greenhouse</span>
        {subtitle ? <span className="block text-xs uppercase tracking-[0.25em] text-[color:var(--color-soil-60)]">{subtitle}</span> : null}
      </div>
    </div>
  )
}
