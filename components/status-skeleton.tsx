export function StatusSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--list-row)] px-4 py-4 md:grid md:grid-cols-[minmax(0,2.8fr)_minmax(0,1.2fr)_minmax(0,3.4fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-6">
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
