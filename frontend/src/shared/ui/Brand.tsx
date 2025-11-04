import type { HTMLAttributes } from 'react'
import { alpha, palette } from '../../theme/palette'

type BrandProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
  subtitle?: string
  variant?: 'light' | 'dark'
}

export const Brand = ({
  className,
  orientation = 'horizontal',
  subtitle,
  variant = 'light',
  ...rest
}: BrandProps) => {
  const containerClasses = [
    'flex items-center gap-3',
    orientation === 'vertical' ? 'flex-col items-start text-left' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const badgeBackground =
    variant === 'dark'
      ? 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)'
      : `linear-gradient(135deg, ${palette.evergreen} 0%, ${alpha(palette.moss, 0.9)} 100%)`

  const badgeShadow =
    variant === 'dark'
      ? 'shadow-[0_16px_36px_rgba(37,99,235,0.35)]'
      : 'shadow-[0_12px_28px_rgba(31,111,74,0.35)]'

  const titleClass =
    variant === 'dark' ? 'text-white' : 'text-[color:var(--color-evergreen)]'
  const subtitleClass =
    variant === 'dark' ? 'text-white/60' : 'text-[color:var(--color-soil-60)]'

  return (
    <div className={containerClasses} {...rest}>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold text-white ${badgeShadow}`}
        style={{ background: badgeBackground }}
        aria-hidden="true"
      >
        TG
      </div>
      <div className={orientation === 'vertical' ? 'space-y-1' : ''}>
        <span className={`block text-base font-semibold ${titleClass}`}>Tiny Greenhouse</span>
        {subtitle ? (
          <span className={`block text-xs uppercase tracking-[0.25em] ${subtitleClass}`}>{subtitle}</span>
        ) : null}
      </div>
    </div>
  )
}
