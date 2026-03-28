import { Card } from 'flowbite-react';

const CARD_CLASS =
  'rounded-3xl border border-[#1f2a3d] bg-[#111c2d] shadow-[0_24px_60px_rgba(8,20,38,0.35)]';
const INNER_CLASS = 'rounded-2xl border border-[#1f2a3d] bg-[#0b1220] p-4';

const Bone = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

/** 4 sensor card placeholders inside a wrapper card */
const SensorCardsSkeleton = () => (
  <Card className={CARD_CLASS}>
    <Bone className="h-4 w-32" />
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={INNER_CLASS}>
          <div className="flex items-center justify-between">
            <Bone className="h-3.5 w-20" />
            <Bone className="h-5 w-5 rounded-full" />
          </div>
          <div className="mt-5 flex justify-center">
            <Bone className="h-9 w-24" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between">
              <Bone className="h-2.5 w-8" />
              <Bone className="h-2.5 w-8" />
            </div>
            <Bone className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

/** Environment chart card placeholder */
const ChartSkeleton = () => (
  <Card className={CARD_CLASS}>
    <div className="flex items-center justify-between">
      <Bone className="h-4 w-36" />
      <Bone className="h-8 w-36 rounded-lg" />
    </div>
    <div className="mt-4 space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={INNER_CLASS}>
          <Bone className="mb-2 h-3 w-20" />
          <Bone className="h-[140px] w-full rounded-xl" />
        </div>
      ))}
    </div>
  </Card>
);

/** Bottom row: alerts + readings side by side */
const BottomRowSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
    {/* Alert panel */}
    <Card className={CARD_CLASS}>
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-1.5">
          <Bone className="h-4 w-24" />
          <Bone className="h-3 w-44" />
        </div>
        <Bone className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#22324a] p-3 space-y-2">
            <div className="flex justify-between">
              <Bone className="h-3.5 w-28" />
              <Bone className="h-4 w-14 rounded-full" />
            </div>
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </Card>

    {/* Recent readings */}
    <Card className={CARD_CLASS}>
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-24" />
        <Bone className="h-8 w-36 rounded-lg" />
      </div>
      <div className="mt-3 space-y-0">
        <div className="flex gap-4 border-b border-[#1f2a3d] pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-3 w-10 flex-1" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2.5 border-b border-[#1f2a3d]">
            {Array.from({ length: 6 }).map((_, j) => (
              <Bone key={j} className="h-3 w-10 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  </div>
);

export const DashboardSkeleton = () => (
  <>
    <SensorCardsSkeleton />
    <ChartSkeleton />
    <BottomRowSkeleton />
  </>
);
