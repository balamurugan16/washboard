import { Apple, ArrowUpRight, Check } from 'lucide-react';
import Link from 'next/link';
import { getErrorCode } from '@/lib/db';
import { listHabitCheckIns, listHabitPeriods } from '@/lib/habits';
import DashboardNav from './dashboard-nav';
import SleepOverview from './sleep-overview';
import WeightOverview from './weight-overview';

export const dynamic = 'force-dynamic';

const dateLabel = new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' });

async function TodayHabits({ date }: { date: string }) {
  let content;

  try {
    const periods = await listHabitPeriods();
    const period = periods.find(({ startDate, endDate }) => startDate <= date && date <= endDate);

    if (period) {
      const checkIns = await listHabitCheckIns(period.id, date, date);
      const completed = new Set(checkIns.map(({ habitIndex }) => habitIndex));
      const habits = period.habits.map((name, index) => ({ name, done: completed.has(index + 1) }));
      const doneCount = habits.filter(({ done }) => done).length;

      content = (
        <>
          <div className="today-progress">
            <span><strong>{doneCount} / {habits.length}</strong> completed</span>
            <progress value={doneCount} max={habits.length} aria-label="Today's habit completion" />
          </div>
          <ul className="today-habits">
            {habits.map(({ name, done }) => (
              <li key={name}>
                <span className={done ? 'habit-done' : 'habit-pending'} aria-hidden="true">
                  {done ? <Check size={17} /> : '–'}
                </span>
                <span>{name}</span>
                <small>{done ? 'Done' : 'Pending'}</small>
              </li>
            ))}
          </ul>
        </>
      );
    } else {
      content = <p>No habits scheduled for today.</p>;
    }
  } catch (error) {
    console.error('Could not load today’s habits.', getErrorCode(error) ?? 'database unavailable');
    content = <p role="status">Today’s habits are temporarily unavailable.</p>;
  }

  return (
    <section className="panel history today" aria-labelledby="today-heading">
      <div className="section-header">
        <h2 id="today-heading">Today’s habits</h2>
        <Link className="dashboard-link" href="/habits">Habit history <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
      {content}
    </section>
  );
}

export default function HomePage() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  return (
    <div className="workspace">
      <DashboardNav current="/" />
      <main className="dashboard-home">
        <section className="hero panel">
          <div>
            <h1>Nutrition tracker<span>.</span></h1>
            <p><time dateTime={today}>{dateLabel.format(now)}</time> · UTC</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-card"><Apple strokeWidth={2.4} /></div>
            <span className="hero-spark">✦</span>
          </div>
        </section>
        <WeightOverview showHistory={false} />
        <TodayHabits date={today} />
        <SleepOverview now={now} />
      </main>
    </div>
  );
}
