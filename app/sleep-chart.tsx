'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SleepDay } from '@/lib/time';

const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const hours = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

export default function SleepChart({ days }: { days: SleepDay[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} title="Hours slept per day">
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(date: string) => shortDate.format(new Date(date))} minTickGap={16} />
          <YAxis unit=" h" width={44} />
          <Tooltip
            labelFormatter={(date) => typeof date === 'string' ? shortDate.format(new Date(date)) : ''}
            formatter={(value) => [typeof value === 'number' ? `${hours.format(value)} h` : '', 'Sleep']}
          />
          <Bar dataKey="hours" fill="var(--blue)" stroke="var(--ink)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
