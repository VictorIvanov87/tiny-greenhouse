import { Card, Label, TextInput, Select, Button } from 'flowbite-react';

const SettingsPage = () => {
  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Greenhouse Settings
        </h1>
        <p className="text-sm text-slate-400">
          Configure how the greenhouse captures data, timelapses, and maintenance reminders.
        </p>
      </div>

      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <form className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timelapse-frequency" value="Timelapse cadence" className="text-slate-300" />
            <Select
              id="timelapse-frequency"
              disabled
              value="24"
              className="border-[#22324a] bg-[#0f1729] text-slate-200 focus:border-sky-500 focus:ring-sky-500/40"
            >
              <option value="6">Every 6 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Every 24 hours</option>
            </Select>
            <p className="text-xs text-slate-400">
              Timelapse captures will occur automatically at the selected cadence.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timelapse-time" value="Capture time" className="text-slate-300" />
            <TextInput
              id="timelapse-time"
              type="time"
              value="09:00"
              disabled
              className="border-[#22324a] bg-[#0f1729] text-slate-200"
            />
            <p className="text-xs text-slate-400">
              Adjust capture window to align with your greenhouse lighting.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="maintenance-reminder" value="Maintenance reminders" className="text-slate-300" />
            <TextInput
              id="maintenance-reminder"
              type="text"
              value="Check nutrient solution every Sunday at 10:00"
              readOnly
              className="border-[#22324a] bg-[#0f1729] text-slate-200"
            />
            <p className="text-xs text-slate-400">
              Customize reminders to keep your routine on track. Editing will be available soon.
            </p>
          </div>

          <div className="md:col-span-2">
            <Button
              disabled
              className="w-full border-none bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_14px_36px_rgba(14,70,155,0.4)] transition hover:from-sky-400 hover:to-indigo-400 md:w-auto"
            >
              Save changes (coming soon)
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SettingsPage;
