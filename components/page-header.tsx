'use client';

import { useEffect, useState } from 'react';

interface PageHeaderProps {
  lastUpdated: Date | null;
}

const ALERT_WINDOW_MS = 15 * 60 * 1000;

export function PageHeader({ lastUpdated }: PageHeaderProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const formattedLastUpdated = lastUpdated
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(lastUpdated)
    : null;
  const ledShouldBeRed = lastUpdated
    ? currentTime - lastUpdated.getTime() >= ALERT_WINDOW_MS
    : false;

  return (
    <div className="flex flex-col gap-5 border-b border-(--panel-border) pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-300/78">
          Provider Operations Feed
        </p>
        <h1 className="font-headline mb-3 text-4xl font-bold tracking-[-0.04em] text-white md:text-5xl">
          Global Provider Status
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-(--muted) md:text-base">
          A searchable operations board for cloud, AI, and SaaS vendors. Scan active incidents,
          filter by platform class, and jump to each provider&apos;s official status page fast.
        </p>
      </div>

      {formattedLastUpdated && (
        <div className="inline-flex items-center gap-3 self-start rounded-full border border-(--panel-border) bg-(--toolbar) px-4 py-2 text-xs uppercase tracking-[0.24em] text-(--muted) lg:self-auto">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              ledShouldBeRed
                ? 'bg-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.7)]'
                : 'bg-sky-300 shadow-[0_0_16px_rgba(123,208,255,0.65)]'
            }`}
          ></span>
          Last Refreshed
          <span className="normal-case tracking-normal text-white">{formattedLastUpdated}</span>
        </div>
      )}
    </div>
  );
}
