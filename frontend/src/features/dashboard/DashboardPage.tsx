import { Card } from 'flowbite-react';
import { useOutletContext } from 'react-router-dom';
import type { SetupProfile } from '../setup/state';
import { KpiCards } from './components/KpiCards';
import { RecentTelemetry } from './components/RecentTelemetry';
import { TimelapsePreview } from './components/TimelapsePreview';

type DashboardContext = {
  profile: SetupProfile;
};

const greetingByPlant = (plantType?: string) => {
  if (!plantType) {
    return 'Welcome back';
  }

  return `Welcome back, ${plantType.replace(/-/g, ' ')} caretaker`;
};

const DashboardPage = () => {
  const { profile } = useOutletContext<DashboardContext>();

  return (
    <div className="space-y-10">
      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
            {greetingByPlant(profile.plantType)}
          </h1>
          <p className="text-sm text-slate-400">
            Here’s the latest snapshot of your greenhouse performance and captured moments.
          </p>
        </div>
      </Card>

      <section>
        <KpiCards />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
        <RecentTelemetry />
        <TimelapsePreview />
      </section>
    </div>
  );
};

export default DashboardPage;
