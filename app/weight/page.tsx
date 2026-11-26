import { Scale } from 'lucide-react';
import DashboardNav from '../dashboard-nav';
import WeightOverview from '../weight-overview';

export const dynamic = 'force-dynamic';

export default function WeightPage() {
  return (
    <div className="workspace">
      <DashboardNav current="/weight" />
      <main>
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
        <WeightOverview />
      </main>
    </div>
  );
}
