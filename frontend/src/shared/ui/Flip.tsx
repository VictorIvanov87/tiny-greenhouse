import type { ReactNode } from 'react'

type FlipProps = {
  front: ReactNode
  back: ReactNode
  isFlipped: boolean
  className?: string
}

export function Flip({ front, back, isFlipped, className }: FlipProps) {
  const classes = ['flip', isFlipped ? 'flip--flipped' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <div className="flip__inner">
        <div className="flip__face">{front}</div>
        <div className="flip__face flip__face--back">{back}</div>
      </div>
    </div>
  )
}
