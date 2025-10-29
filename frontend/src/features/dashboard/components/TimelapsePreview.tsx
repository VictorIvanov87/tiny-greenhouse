import { Button, Card } from 'flowbite-react'
import { alpha, palette } from '../../../theme/palette'

export const TimelapsePreview = () => {
  return (
    <Card className="h-full rounded-3xl border border-[color:var(--color-evergreen-soft)] bg-white/80 shadow-[0_18px_45px_rgba(31,111,74,0.12)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[color:var(--color-evergreen)]">Timelapse preview</h2>
          <p className="text-sm text-[color:var(--color-soil-60)]">
            A daily composite of your greenhouse beds will appear here once cameras are paired.
          </p>
        </div>
        <Button
          color="light"
          className="w-full md:w-auto !border-none !text-white !shadow-[0_12px_32px_rgba(31,111,74,0.25)] hover:!-translate-y-0.5 hover:!shadow-[0_18px_40px_rgba(31,111,74,0.3)] focus-visible:!ring-4 focus-visible:!ring-[color:var(--color-moss-soft)]"
          style={{ backgroundColor: palette.evergreen }}
        >
          Manage cameras
        </Button>
      </div>
      <div
        className="relative flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-evergreen-soft)] bg-[color:var(--color-sage-soft)] text-sm text-[color:var(--color-soil-60)]"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, ${alpha(palette.sunlight, 0.25)} 0%, transparent 45%), radial-gradient(circle at 70% 60%, ${alpha(palette.moss, 0.2)} 0%, transparent 50%)`,
        }}
      >
        <div className="space-y-2 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-2xl shadow-lg">
            🎥
          </span>
          <p>Timelapse snapshots will appear once your greenhouse cameras report in.</p>
        </div>
      </div>
    </Card>
  )
}
