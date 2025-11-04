import { Card, Textarea, Button, Badge } from 'flowbite-react';

const AssistantPage = () => {
  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">Assistant</h1>
        <p className="text-sm text-slate-400">
          Chat with your greenhouse co-pilot for quick tips, routines, and sensor explanations.
        </p>
      </div>

      <Card className="flex h-[32rem] flex-col rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#1f2a3d] pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Greenhouse Assistant</h2>
            <p className="text-xs text-slate-400">
              Answering from recent telemetry and your care schedule.
            </p>
          </div>
          <Badge className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
            Live
          </Badge>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto py-4 pr-1">
          <div className="max-w-[80%] rounded-2xl bg-[#1a2740] px-4 py-3 text-sm text-sky-200">
            <p className="font-semibold">Assistant</p>
            <p>
              Soil moisture dipped below 20% overnight. Plan a watering cycle or enable auto-irrigation from the
              settings page.
            </p>
          </div>
          <div className="ml-auto max-w-[80%] rounded-2xl border border-[#1f2a3d] bg-[#0f1729] px-4 py-3 text-sm text-slate-200 shadow-[0_16px_36px_rgba(8,20,38,0.35)]">
            <p className="font-semibold text-slate-100">You</p>
            <p>Schedule a watering cycle for this evening and remind me to mist the herbs.</p>
          </div>
          <div className="max-w-[80%] rounded-2xl bg-[#1a2740] px-4 py-3 text-sm text-sky-200">
            <p className="font-semibold">Assistant</p>
            <p>
              On it! I&apos;ll queue a watering cycle for 7:00 PM and add a misting reminder to tomorrow&apos;s
              agenda.
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-3 border-t border-[#1f2a3d] pt-4">
          <Textarea
            rows={3}
            placeholder="Describe what you need and I’ll help automate the next step…"
            disabled
            className="border-[#22324a] bg-[#0f1729] text-slate-300 placeholder:text-slate-500"
          />
          <Button
            disabled
            className="w-full border-none bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_14px_36px_rgba(14,70,155,0.4)] transition hover:from-sky-400 hover:to-indigo-400 md:w-auto"
          >
            Send (coming soon)
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AssistantPage;
