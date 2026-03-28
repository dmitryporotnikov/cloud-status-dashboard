import { NormalizedStatus } from '@/lib/status/types';
import { getProviderConfig, PROVIDER_CATEGORIES } from '@/lib/status/constants';
import { StatusCard } from './status-card';

interface StatusGridProps {
  statuses: NormalizedStatus[];
}

export function StatusGrid({ statuses }: StatusGridProps) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--list-surface)] shadow-[0_26px_90px_rgba(2,10,28,0.36)]">
      <div className="hidden grid-cols-[minmax(0,2.8fr)_minmax(0,1.2fr)_minmax(0,3.4fr)_minmax(0,1.4fr)_auto] gap-6 border-b border-[var(--panel-border)] bg-[var(--toolbar)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)] md:grid">
        <div>Provider Identity</div>
        <div className="text-center">Status</div>
        <div>Summary</div>
        <div className="text-right">Updated</div>
        <div className="text-right">Link</div>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
      {PROVIDER_CATEGORIES.map((category) => {
        const categoryStatuses = statuses.filter(
          (status) => getProviderConfig(status.id).category === category.id
        );

        if (categoryStatuses.length === 0) {
          return null;
        }

        return (
          <section key={category.id} aria-labelledby={`${category.id}-heading`} className="space-y-2">
            <div className="flex flex-col gap-2 px-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id={`${category.id}-heading`}
                  className="font-headline text-2xl font-semibold tracking-[-0.04em] text-white"
                >
                  {category.label}
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">{category.description}</p>
              </div>
              <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                {categoryStatuses.length} providers
              </p>
            </div>

            <div className="space-y-2">
              {categoryStatuses.map((status) => (
                <StatusCard key={status.id} status={status} />
              ))}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}
