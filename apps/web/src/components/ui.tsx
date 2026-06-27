import { type ReactNode } from 'react';

/**
 * Card — white panel used throughout the Command Center.
 * Matches the `.card` CSS class used on public pages:
 *   border-radius = rounded-card (28 px, from tailwind.config.js)
 *   shadow        = shadow-soft  (from tailwind.config.js)
 * Pass padding and margin via className (e.g. "p-6" or "mt-6 p-4 sm:p-6").
 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-slate-200 bg-white shadow-soft ${className}`}>
      {children}
    </div>
  );
}
