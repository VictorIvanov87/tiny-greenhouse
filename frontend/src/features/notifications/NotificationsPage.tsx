import { useState } from 'react';
import { Card, ToggleSwitch } from 'flowbite-react';

const NotificationsPage = () => {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(false);

  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Notification Preferences
        </h1>
        <p className="text-sm text-slate-400">
          Decide how Tiny Greenhouse keeps you informed about your plants, sensors, and activity.
        </p>
      </div>

      <Card className="rounded-3xl border border-[#1f2a3d] bg-[#111c2d] text-slate-200 shadow-[0_24px_60px_rgba(8,20,38,0.35)]">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Critical greenhouse alerts
              </h2>
              <p className="text-xs text-slate-400">
                Real-time notifications for temperature, humidity, and irrigation anomalies.
              </p>
            </div>
            <ToggleSwitch
              label="SMS"
              checked={alertsEnabled}
              onChange={setAlertsEnabled}
              className="justify-end"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Daily health digest
              </h2>
              <p className="text-xs text-slate-400">
                Receive a morning recap of sensor trends and recommended actions.
              </p>
            </div>
            <ToggleSwitch
              label="Email"
              checked={digestEnabled}
              onChange={setDigestEnabled}
              className="justify-end"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotificationsPage;
