import Link from 'next/link';
import { z } from 'zod';
import { getErrorCode } from '@/lib/db';
import { listTimeEntriesInRange, listTagTotals } from '@/lib/time';
import DashboardNav from '../dashboard-nav';
import EditEntry from './edit-entry';

export const dynamic = 'force-dynamic';

const zone = 'Asia/Kolkata';
const localDate = new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
const localTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hourCycle: 'h23',
});
const clock = new Intl.DateTimeFormat('en-IN', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dateLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const hours = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function shiftDate(date: string, days: number) {
  const day = new Date(date);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

function url(date: string, view: 'day' | 'week') {
  return `/time-audit?date=${date}&view=${view}`;
}

function inputTime(date: Date) {
  return `${localDate.format(date)}T${localTime.format(date).replace(',', '.')}`;
}

async function Calendar({ dates, until, today }: { dates: string[]; until: string; today: string }) {
  let entries;
  try {
    entries = await listTimeEntriesInRange(dates[0], until);
  } catch (error) {
    console.error('Could not load time entries.', getErrorCode(error) ?? 'database unavailable');
    return <p role="status">Time entries are temporarily unavailable.</p>;
  }

  return (
    <div className="audit-scroll" role="region" aria-label="Calendar entries" tabIndex={0}>
      <div className={dates.length === 1 ? 'audit-calendar' : 'audit-calendar audit-week'}>
        {dates.map((date) => {
          const start = new Date(`${date}T00:00:00+05:30`);
          const end = new Date(`${shiftDate(date, 1)}T00:00:00+05:30`);
          const dayEntries = entries.filter((entry) => entry.startAt < end && entry.endAt > start);
          return (
            <section key={date} className="audit-day" aria-labelledby={`audit-${date}`}>
              <h3 id={`audit-${date}`}>
                <Link href={url(date, 'day')} aria-current={date === today ? 'date' : undefined}>
                  <time dateTime={date}>{dateLabel.format(new Date(date))}</time>
                </Link>
              </h3>
              {dayEntries.length === 0 ? <p>No entries</p> : (
                <ul>
                  {dayEntries.map(({ id, startAt, endAt, activity, tag }) => (
                    <li key={id} className="audit-entry">
                      <small>{startAt < start ? '00:00' : clock.format(startAt)} – {endAt >= end ? '24:00' : clock.format(endAt)}</small>
                      <strong>{activity}</strong>
                      <span className="entry-count">{tag}</span>
                      <EditEntry key={JSON.stringify([startAt, endAt, activity, tag])}
                        id={id} startAt={inputTime(startAt)} endAt={inputTime(endAt)} activity={activity} tag={tag} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

async function TagTotals({ date, weekStart }: { date: string; weekStart: string }) {
  let totals;
  try {
    totals = await listTagTotals(date, weekStart);
  } catch (error) {
    console.error('Could not load tag totals.', getErrorCode(error) ?? 'database unavailable');
  }

  return (
    <section className="panel history" aria-labelledby="audit-totals">
      <div className="section-header">
        <div>
          <h2 id="audit-totals">Time by tag</h2>
          <p>Day, week, and month containing {dateLabel.format(new Date(date))}</p>
        </div>
      </div>
      {totals === undefined ? <p role="status">Tag totals are temporarily unavailable.</p> : totals.length === 0 ? (
        <p>No time entries yet.</p>
      ) : (
        <div className="table-wrap">
          <table aria-labelledby="audit-totals">
            <thead><tr>
              {['Tag', 'Day', 'Week', 'Month', 'Overall'].map((label) => <th key={label} scope="col">{label}</th>)}
            </tr></thead>
            <tbody>
              {totals.map(({ tag, day, week, month, overall }) => (
                <tr key={tag}>
                  <th scope="row">{tag}</th>
                  {[day, week, month, overall].map((value, index) => <td key={index}>{hours.format(value)} h</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function TimeAuditPage({ searchParams }: {
  searchParams: Promise<{ date?: string | string[]; view?: string | string[] }>;
}) {
  const params = await searchParams;
  const today = localDate.format(new Date());
  const date = z.iso.date().safeParse(params.date).data ?? today;
  const view = params.view === 'day' ? 'day' : 'week';
  const weekStart = shiftDate(date, -((new Date(date).getUTCDay() + 6) % 7));
  const first = view === 'day' ? date : weekStart;
  const count = view === 'day' ? 1 : 7;
  const dates = Array.from({ length: count }, (_, index) => shiftDate(first, index));

  return (
    <div className="workspace">
      <DashboardNav current="/time-audit" />
      <main>
        <section className="panel history" aria-labelledby="audit-heading">
          <div className="section-header">
            <div>
              <h2 id="audit-heading">Time Audit</h2>
              <p>{dateLabel.format(new Date(first))}{count > 1 && ` – ${dateLabel.format(new Date(dates[6]))}`} · Asia/Kolkata</p>
            </div>
            <nav className="audit-controls" aria-label="Calendar view">
              <Link href={url(date, 'day')} aria-current={view === 'day' ? 'page' : undefined}>Day</Link>
              <Link href={url(date, 'week')} aria-current={view === 'week' ? 'page' : undefined}>Week</Link>
            </nav>
          </div>
          <nav className="audit-controls" aria-label="Calendar navigation">
            <Link href={url(shiftDate(date, -count), view)}>Previous {view}</Link>
            <Link href={url(today, view)}>Today</Link>
            <Link href={url(shiftDate(date, count), view)}>Next {view}</Link>
            <form action="/time-audit">
              <input type="hidden" name="view" value={view} />
              <input type="date" name="date" aria-label="Jump to date" defaultValue={date} required />
              <button type="submit">Go</button>
            </form>
          </nav>
          <Calendar dates={dates} until={shiftDate(first, count)} today={today} />
        </section>
        <TagTotals date={date} weekStart={weekStart} />
      </main>
    </div>
  );
}
