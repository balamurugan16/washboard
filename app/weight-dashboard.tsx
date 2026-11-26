'use client';

import { useState } from 'react';
import { Activity, ArrowDownUp, CalendarDays, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeightEntry, WeightUnit } from '@/lib/weight';

const day = 86_400_000;
const kgPerPound = 0.45359237;
const ranges = { '30D': 30, '90D': 90, All: null } as const;
const rangeLabels = ['30D', '90D', 'All'] as const;
const unitOptions: WeightUnit[] = ['kg', 'lb'];
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const shortTime = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

export default function WeightDashboard({ entries, unavailable }: { entries: WeightEntry[]; unavailable: boolean }) {
  const [range, setRange] = useState<keyof typeof ranges>('All');
  const [units, setUnits] = useState<WeightUnit>('kg');
  const [page, setPage] = useState(0);
  const rangeDays = ranges[range];
  const cutoff = rangeDays === null ? -Infinity : Date.now() - rangeDays * day;
  const filtered = entries.filter(({ recordedAt }) => Date.parse(recordedAt) >= cutoff);
  const chart = filtered.toReversed().map((entry) => ({
    time: Date.parse(entry.recordedAt),
    value: convert(entry, units),
  }));
  const first = chart[0];
  const last = chart[chart.length - 1];
  const oneDay = chart.length > 1 && Math.floor(first.time / day) === Math.floor(last.time / day);
  const latest = entries[0];
  const change = chart.length > 1 ? last.value - first.value : null;
  const average = chart.length ? chart.reduce((sum, point) => sum + point.value, 0) / chart.length : null;
  const pageSize = 10;
  const pageCount = Math.ceil(filtered.length / pageSize);
  const activePage = Math.min(page, Math.max(0, pageCount - 1));
  const pageEntries = filtered.slice(activePage * pageSize, (activePage + 1) * pageSize);

  return (
    <>
      {unavailable && <p className="notice panel" role="status">Weight data is temporarily unavailable.</p>}
      <div className="metrics">
        <Metric icon={Scale} color="yellow" label="Latest weight" value={latest ? number.format(convert(latest, units)) : '—'} unit={units} detail={latest ? shortDate.format(Date.parse(latest.recordedAt)) : 'No measurements yet'} />
        <Metric icon={ArrowDownUp} color="blue" label="Weight change" value={change === null ? '—' : `${change > 0 ? '+' : ''}${number.format(change)}`} unit={units} detail="First to last in range" />
        <Metric icon={Activity} color="green" label="Average weight" value={average === null ? '—' : number.format(average)} unit={units} detail="Across the selected range" />
        <Metric icon={CalendarDays} color="red" label="Entries" value={unavailable ? '—' : number.format(filtered.length)} detail="In the selected range" />
      </div>
      <section className="panel trend" id="trend" aria-labelledby="trend-heading">
        <div className="section-header">
          <div><h2 id="trend-heading">Weight trend</h2><p>Measurements over time</p></div>
          <div className="filters">
            <div className="segmented" aria-label="Time range">
              {rangeLabels.map((label) => <button key={label} aria-pressed={range === label} onClick={() => { setRange(label); setPage(0); }}>{label}</button>)}
            </div>
            <div className="segmented" aria-label="Chart units">
              {unitOptions.map((unit) => <button key={unit} aria-pressed={units === unit} onClick={() => setUnits(unit)}>{unit}</button>)}
            </div>
          </div>
        </div>
        {chart.length ? (
          <div className="chart" aria-label={`Weight trend in ${units}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ right: 18, top: 10 }}>
                <defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3182fa" stopOpacity=".55" /><stop offset="1" stopColor="#3182fa" stopOpacity=".07" /></linearGradient></defs>
                <CartesianGrid stroke="#d8d2be" vertical={false} />
                <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(value) => (oneDay ? shortTime : shortDate).format(value)} minTickGap={28} />
                <YAxis width={60} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(value) => number.format(value)} unit={` ${units}`} />
                <Tooltip labelFormatter={(value) => typeof value === 'number' ? fullDate.format(value) : ''} formatter={(value) => [typeof value === 'number' ? `${number.format(value)} ${units}` : '', 'Weight']} />
                <Area dataKey="value" type="linear" stroke="#141619" strokeWidth={3} fill="url(#weight-fill)" dot={chart.length === 1} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty icon={Activity} unavailable={unavailable} title={entries.length ? 'No entries in this range' : 'No weight entries yet'} detail={entries.length ? 'Choose a wider date range to see more measurements.' : 'Measurements added through MCP will appear here.'} />}
      </section>
      <section className="panel history" id="history" aria-labelledby="history-heading">
        <div className="section-header">
          <div><h2 id="history-heading">Measurement history</h2><p>Latest first · times in UTC</p></div>
          <span className="entry-count">{unavailable ? '—' : filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Recorded</th><th scope="col">Weight</th><th scope="col">Units</th></tr></thead>
            <tbody>
              {pageEntries.map((entry) => <tr key={entry.id}><td><time dateTime={entry.recordedAt}>{fullDate.format(Date.parse(entry.recordedAt))}</time></td><td>{entry.weight}</td><td><span className="unit">{entry.units}</span></td></tr>)}
              {!pageEntries.length && <tr><td colSpan={3} className="empty-row">{unavailable ? 'Measurements could not be loaded.' : 'No measurements to show.'}</td></tr>}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && <div className="pagination"><button disabled={activePage === 0} onClick={() => setPage(activePage - 1)}>Previous</button><span>Page {activePage + 1} of {pageCount}</span><button disabled={activePage === pageCount - 1} onClick={() => setPage(activePage + 1)}>Next</button></div>}
      </section>
    </>
  );
}

function convert(entry: WeightEntry, units: WeightUnit) {
  if (entry.units === units) return entry.weight;
  return units === 'kg' ? entry.weight * kgPerPound : entry.weight / kgPerPound;
}

function Metric({ icon: Icon, color, label, value, unit, detail }: {
  icon: LucideIcon;
  color: 'yellow' | 'blue' | 'green' | 'red';
  label: string;
  value: string;
  unit?: WeightUnit;
  detail: string;
}) {
  return <article className={`panel metric ${color}`}><div className="metric-icon"><Icon size={17} /></div><h2>{label}</h2><div className="metric-value">{value}{unit && value !== '—' && <span>{unit}</span>}</div><p>{detail}</p></article>;
}

function Empty({ icon: Icon, unavailable, title, detail }: {
  icon: LucideIcon;
  unavailable: boolean;
  title: string;
  detail: string;
}) {
  return <div className="chart empty"><span><Icon size={27} /></span><strong>{unavailable ? 'Trend unavailable' : title}</strong>{!unavailable && <p>{detail}</p>}</div>;
}
