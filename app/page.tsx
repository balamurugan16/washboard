import { Activity, ArrowUpRight, CalendarDays, ChartNoAxesCombined, History, Scale } from 'lucide-react';
import { getErrorCode } from '@/lib/db';
import { listWeights, type WeightEntry } from '@/lib/weight';
import WeightDashboard from './weight-dashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let entries: WeightEntry[] = [];
  let unavailable = false;

  try {
    entries = await listWeights();
  } catch (error) {
    console.error('Could not load weight history.', getErrorCode(error) ?? 'database unavailable');
    unavailable = true;
  }

  return (
    <div className="shell">
      <header className="masthead">
        <a className="brand" href="/" aria-label="Washboard home">
          <span className="brand-mark"><Activity size={23} strokeWidth={3} /></span>
          Washboard<span className="brand-dot">.</span>
        </a>
        <span className="masthead-label"><CalendarDays size={16} /> Personal health log</span>
      </header>
      <div className="workspace">
        <aside className="rail">
          <nav aria-label="Weight dashboard">
            <span className="rail-label">Dashboard</span>
            <a className="rail-current" href="#overview"><Scale size={19} /> Weight <ArrowUpRight size={16} /></a>
            <a href="#trend"><ChartNoAxesCombined size={18} /> Trend</a>
            <a href="#history"><History size={18} /> History</a>
          </nav>
        </aside>
        <main id="overview">
          <section className="hero panel">
            <div>
              <p className="eyebrow">Body metrics</p>
              <h1>Weight tracker<span>.</span></h1>
              <p>See how your weight changes over time.</p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-card"><Scale strokeWidth={2.4} /></div>
              <span className="hero-spark">✦</span>
            </div>
          </section>
          <WeightDashboard entries={entries} unavailable={unavailable} />
        </main>
      </div>
    </div>
  );
}
