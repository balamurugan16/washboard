import { getErrorCode } from '@/lib/db';
import { listDailySleep, type SleepDay } from '@/lib/time';
import SleepChart from './sleep-chart';

export default async function SleepOverview({ now }: { now: Date }) {
  let days: SleepDay[] = [];
  let unavailable = false;

  try {
    days = await listDailySleep(now);
  } catch (error) {
    console.error('Could not load sleep history.', getErrorCode(error) ?? 'database unavailable');
    unavailable = true;
  }

  return (
    <section className="panel trend" aria-labelledby="sleep-heading">
      <div className="section-header">
        <div>
          <h2 id="sleep-heading">Daily sleep</h2>
          <p>Hours slept over the last 14 days · Asia/Kolkata</p>
        </div>
      </div>
      {unavailable ? (
        <p role="status">Sleep history is temporarily unavailable.</p>
      ) : days.some(({ hours }) => hours > 0) ? (
        <SleepChart days={days} />
      ) : (
        <p className="chart empty">No sleep logged in the last 14 days.</p>
      )}
    </section>
  );
}
