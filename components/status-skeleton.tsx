import { STATUS_GRID_DESKTOP_COLUMNS } from './status-grid-layout';

export function StatusSkeleton() {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-(--card-border) bg-(--list-row) px-4 py-4 md:grid ${STATUS_GRID_DESKTOP_COLUMNS} md:items-center md:gap-6 md:px-5`}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-white/10"></div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 h-5 w-40 rounded bg-white/10"></div>
          <div className="h-3 w-20 rounded bg-white/10"></div>
        </div>
      </div>

      <div className="mt-4 h-6 w-28 rounded-full bg-white/10 md:mt-0 md:justify-self-center"></div>

      <div className="mt-4 space-y-2 md:mt-0">
        <div className="h-4 w-full rounded bg-white/10"></div>
        <div className="h-4 w-4/5 rounded bg-white/10"></div>
      </div>

      <div className="mt-4 h-4 w-28 rounded bg-white/10 md:mt-0 md:justify-self-end"></div>
      <div className="mt-4 h-4 w-12 rounded bg-white/10 md:mt-0 md:justify-self-end"></div>
    </div>
  );
}
