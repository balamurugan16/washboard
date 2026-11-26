import './globals.css';
import { Activity, CalendarDays } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Washboard | Nutrition tracker',
  description: 'A personal dashboard for weight trends and daily habits.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="masthead">
          <a className="brand" href="/" aria-label="Washboard home">
            <span className="brand-mark"><Activity size={23} strokeWidth={3} /></span>
            Washboard<span className="brand-dot">.</span>
          </a>
          <span className="masthead-label"><CalendarDays size={16} /> Personal nutrition log</span>
        </header>
        {children}
      </body>
    </html>
  );
}
