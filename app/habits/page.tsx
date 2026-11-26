import { Check, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { getErrorCode } from '@/lib/db';
import { listHabitCheckIns, listHabitPeriods } from '@/lib/habits';
import DashboardNav from '../dashboard-nav';

export const dynamic = 'force-dynamic';

const dayMs = 86_400_000;
const daysPerPage = 31;
const dateLabel = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });

function isoDate(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return dateLabel.format(new Date(date));
}

async function HabitHistory({ periodId, page }: { periodId?: string; page?: string }) {
  try {
    const periods = await listHabitPeriods();
    const today = isoDate(Date.now());
    const period = periods.find(({ id }) => String(id) === periodId)
      ?? periods.find(({ startDate, endDate }) => startDate <= today && today <= endDate)
      ?? periods[0];

    if (!period) {
      return (
        <section className="panel history">
          <div className="section-header"><h2>No habit periods yet</h2></div>
          <p>Create your first period through MCP with <code>create_habit_period</code>.</p>
        </section>
      );
    }

    const start = Date.parse(period.startDate);
    const lastDay = Date.parse(period.endDate);
    const pageCount = Math.ceil(((lastDay - start) / dayMs + 1) / daysPerPage);
    const currentDay = Math.min(lastDay, Math.max(start, Date.parse(today)));
    const defaultPage = Math.floor((currentDay - start) / dayMs / daysPerPage) + 1;
    const requestedPage = Number(page);
    const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, pageCount)
      : defaultPage;
    const first = start + (currentPage - 1) * daysPerPage * dayMs;
    const last = Math.min(lastDay, first + (daysPerPage - 1) * dayMs);
    const dates = Array.from({ length: (last - first) / dayMs + 1 }, (_, i) => isoDate(first + i * dayMs));
    const checkIns = await listHabitCheckIns(period.id, isoDate(first), isoDate(last));
    const completed = new Set(checkIns.map(({ date, habitIndex }) => `${date}/${habitIndex}`));

    return (
      <section className="panel history">
        {periods.length > 1 && (
          <nav className="habit-periods" aria-label="Habit periods">
            {periods.map(({ id, name, startDate }) => (
              <Link key={id} href={`/habits?period=${id}`} aria-current={period.id === id ? 'page' : undefined}>
                {name} <small>{formatDate(startDate)}</small>
              </Link>
            ))}
          </nav>
        )}
        <div className="section-header">
          <div>
            <h2>{period.name}</h2>
            <p>{formatDate(period.startDate)} – {formatDate(period.endDate)}</p>
          </div>
          <span className="entry-count">{period.habits.length} {period.habits.length === 1 ? 'habit' : 'habits'}</span>
        </div>
        <div className="table-wrap habit-table" tabIndex={0} role="region" aria-label="Daily habit completions">
          <table>
            <thead><tr>
              <th scope="col">Date</th>
              {period.habits.map((habit) => <th scope="col" key={habit}>{habit}</th>)}
            </tr></thead>
            <tbody>
              {dates.map((date) => (
                <tr key={date} aria-current={date === today ? 'date' : undefined}>
                  <th scope="row"><time dateTime={date}>{formatDate(date)}</time></th>
                  {period.habits.map((habit, index) => {
                    const done = completed.has(`${date}/${index + 1}`);
                    return (
                      <td key={habit}>
                        <span className={done ? 'habit-done' : 'habit-pending'} role="img" aria-label={done ? 'Completed' : 'No completion recorded'}>
                          {done ? <Check size={17} aria-hidden="true" /> : <span aria-hidden="true">–</span>}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <nav className="pagination habit-pages" aria-label="Habit dates">
            {currentPage > 1 && <Link href={`/habits?period=${period.id}&page=${currentPage - 1}`}>Earlier dates</Link>}
            <span>{currentPage} / {pageCount}</span>
            {currentPage < pageCount && <Link href={`/habits?period=${period.id}&page=${currentPage + 1}`}>Later dates</Link>}
          </nav>
        )}
      </section>
    );
  } catch (error) {
    console.error('Could not load habit history.', getErrorCode(error) ?? 'database unavailable');
    return <p className="panel notice">Habit history is temporarily unavailable.</p>;
  }
}

export default async function HabitsPage({ searchParams }: {
  searchParams: Promise<{ period?: string; page?: string }>;
}) {
  const { period, page } = await searchParams;

  return (
    <div className="workspace">
      <DashboardNav current="/habits" />
      <main>
        <section className="hero panel">
          <div>
            <h1>Habit tracker<span>.</span></h1>
            <p>See your daily progress across tracking periods.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-card"><ListChecks strokeWidth={2.4} /></div>
            <span className="hero-spark">✦</span>
          </div>
        </section>
        <HabitHistory periodId={period} page={page} />
      </main>
    </div>
  );
}
