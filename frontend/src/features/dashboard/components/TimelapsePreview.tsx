import { Button, Card } from 'flowbite-react'

export const TimelapsePreview = () => {
  return (
    <Card className="h-full rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Timelapse preview</h2>
          <p className="text-sm text-slate-400">
            A daily composite of your greenhouse beds will appear here once cameras are paired.
          </p>
        </div>
        <Button
          color="light"
          className="w-full border-none bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_14px_36px_rgba(14,70,155,0.4)] transition hover:from-sky-400 hover:to-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:w-auto"
        >
          Manage cameras
        </Button>
      </div>
      <div
        className="relative flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-[#1f2a3d] bg-[#0f1729] text-sm text-slate-400"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.25) 0%, transparent 45%), radial-gradient(circle at 70% 60%, rgba(249,115,22,0.25) 0%, transparent 55%)',
        }}
      >
        <div className="space-y-2 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#19253c] text-2xl text-sky-300 shadow-lg">
            🎥
          </span>
          <p>Timelapse snapshots will appear once your greenhouse cameras report in.</p>
        </div>
      </div>
    </Card>
  )
}
