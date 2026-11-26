import { House, ListChecks, Scale } from 'lucide-react';
import Link from 'next/link';

const pages = [
  { href: '/', label: 'Home', icon: House },
  { href: '/habits', label: 'Habits', icon: ListChecks },
  { href: '/weight', label: 'Weight', icon: Scale },
] as const;

export default function DashboardNav({ current }: { current: typeof pages[number]['href'] }) {
  return (
    <aside className="rail">
      <nav aria-label="Dashboard">
        <span className="rail-label">Dashboard</span>
        {pages.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={current === href ? 'rail-current' : undefined}
            aria-current={current === href ? 'page' : undefined}>
            <Icon size={19} aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
