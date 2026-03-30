'use client';

import { startTransition, useCallback, useDeferredValue, useEffect, useState } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  LayoutList,
  Activity,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StatusGrid } from '@/components/status-grid';
import { StatusSkeleton } from '@/components/status-skeleton';
import { PageHeader } from '@/components/page-header';
import { STATUS_GRID_DESKTOP_COLUMNS } from '@/components/status-grid-layout';
import {
  CLIENT_REFRESH_MS,
  getProviderConfig,
  getProvidersByCategory,
  PROVIDER_CATEGORIES,
  PROVIDERS,
} from '@/lib/status/constants';
import { ProviderCategory, ProviderStatus, NormalizedStatus } from '@/lib/status/types';

type CategoryFilter = 'all' | ProviderCategory;
type StatusFilter = 'all' | 'operational' | 'nonOperational';
type CategoryStatuses = Record<ProviderCategory, NormalizedStatus[] | null>;
type CategoryErrors = Partial<Record<ProviderCategory, string>>;
type DashboardFilterPreferences = {
  activeCategory: CategoryFilter;
  statusFilter: StatusFilter;
  selectedProviderIds: string[];
};

const DASHBOARD_FILTERS_COOKIE = 'status_dashboard_filters';
const DASHBOARD_FILTERS_MAX_AGE_SECONDS = 60 * 60 * 24 * 120;
const NON_OPERATIONAL_STATUSES: ProviderStatus[] = ['degraded', 'outage', 'maintenance'];
const VALID_PROVIDER_IDS = new Set(PROVIDERS.map((provider) => provider.id));

const CATEGORY_FILTERS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'All Providers' },
  ...PROVIDER_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
  })),
];

function matchesSearchQuery(status: NormalizedStatus, query: string): boolean {
  if (!query) {
    return true;
  }

  const provider = getProviderConfig(status.id);
  const haystack = [
    status.id,
    status.name,
    status.status,
    status.description,
    status.notifications?.join(' ') ?? '',
    provider.category,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function matchesStatusFilter(status: NormalizedStatus, statusFilter: StatusFilter): boolean {
  if (statusFilter === 'all') {
    return true;
  }

  if (statusFilter === 'operational') {
    return status.status === 'operational';
  }

  return NON_OPERATIONAL_STATUSES.includes(status.status);
}

function isNonOperationalStatus(status: ProviderStatus): boolean {
  return NON_OPERATIONAL_STATUSES.includes(status);
}

function getStatusCount(statuses: NormalizedStatus[], value: ProviderStatus): number {
  return statuses.filter((status) => status.status === value).length;
}

function isCategoryFilter(value: string): value is CategoryFilter {
  return value === 'all' || PROVIDER_CATEGORIES.some((category) => category.id === value);
}

function isStatusFilter(value: string): value is StatusFilter {
  return value === 'all' || value === 'operational' || value === 'nonOperational';
}

function readDashboardFilterPreferences(): DashboardFilterPreferences | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const rawCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${DASHBOARD_FILTERS_COOKIE}=`));

  if (!rawCookie) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(rawCookie.slice(DASHBOARD_FILTERS_COOKIE.length + 1));
    const parsed = JSON.parse(decoded) as Partial<DashboardFilterPreferences>;
    const selectedProviderIds = Array.isArray(parsed.selectedProviderIds)
      ? parsed.selectedProviderIds.filter(
          (value): value is string => typeof value === 'string' && VALID_PROVIDER_IDS.has(value)
        )
      : [];

    return {
      activeCategory:
        typeof parsed.activeCategory === 'string' && isCategoryFilter(parsed.activeCategory)
          ? parsed.activeCategory
          : 'all',
      statusFilter:
        typeof parsed.statusFilter === 'string' && isStatusFilter(parsed.statusFilter)
          ? parsed.statusFilter
          : 'all',
      selectedProviderIds,
    };
  } catch {
    return null;
  }
}

function writeDashboardFilterPreferences(preferences: DashboardFilterPreferences) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${DASHBOARD_FILTERS_COOKIE}=${encodeURIComponent(
    JSON.stringify(preferences)
  )}; path=/; max-age=${DASHBOARD_FILTERS_MAX_AGE_SECONDS}; samesite=lax`;
}

const INITIAL_CATEGORY_STATUSES: CategoryStatuses = {
  iaas: null,
  saas: null,
};

function LoadingList({ categories }: { categories?: ProviderCategory[] }) {
  const visibleCategories = categories
    ? PROVIDER_CATEGORIES.filter((category) => categories.includes(category.id))
    : PROVIDER_CATEGORIES;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--list-surface)] shadow-[0_26px_90px_rgba(2,10,28,0.36)]">
      <div className="hidden border-b border-[var(--panel-border)] bg-[var(--toolbar)]/80 px-3 py-3 sm:px-4 md:block">
        <div
          className={`grid ${STATUS_GRID_DESKTOP_COLUMNS} gap-6 px-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]`}
        >
          <div>Provider Identity</div>
          <div className="text-center">Status</div>
          <div>Summary</div>
          <div className="text-right">Updated</div>
          <div className="text-right">Link</div>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        {visibleCategories.map((category) => (
          <section key={category.id} className="space-y-2">
            <div className="flex flex-col gap-2 px-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-headline text-2xl font-semibold tracking-[-0.04em] text-white">
                  {category.label}
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">{category.description}</p>
              </div>
              <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                {getProvidersByCategory(category.id).length} providers
              </p>
            </div>

            <div className="space-y-2">
              {Array.from({ length: getProvidersByCategory(category.id).length }).map((_, index) => (
                <StatusSkeleton key={`${category.id}-${index}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [categoryStatuses, setCategoryStatuses] =
    useState<CategoryStatuses>(INITIAL_CATEGORY_STATUSES);
  const [categoryErrors, setCategoryErrors] = useState<CategoryErrors>({});
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [isServiceFilterOpen, setIsServiceFilterOpen] = useState(false);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const fetchCategoryStatuses = useCallback(async (category: ProviderCategory) => {
    try {
      const response = await fetch(`/api/status?category=${category}`, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = (await response.json()) as NormalizedStatus[];

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Status data is temporarily unavailable');
      }

      startTransition(() => {
        setCategoryStatuses((current) => ({
          ...current,
          [category]: data,
        }));
        setCategoryErrors((current) => {
          const nextErrors = { ...current };
          delete nextErrors[category];
          return nextErrors;
        });
      });
    } catch (err) {
      setCategoryErrors((current) => ({
        ...current,
        [category]: err instanceof Error ? err.message : 'An error occurred',
      }));
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    await Promise.allSettled(
      PROVIDER_CATEGORIES.map(({ id }) => fetchCategoryStatuses(id))
    );
  }, [fetchCategoryStatuses]);

  useEffect(() => {
    void fetchStatuses();

    const interval = setInterval(() => {
      void fetchStatuses();
    }, CLIENT_REFRESH_MS);

    return () => clearInterval(interval);
  }, [fetchStatuses]);

  useEffect(() => {
    const savedPreferences = readDashboardFilterPreferences();

    if (savedPreferences) {
      setActiveCategory(savedPreferences.activeCategory);
      setStatusFilter(savedPreferences.statusFilter);
      setSelectedProviderIds(savedPreferences.selectedProviderIds);
    }

    setPreferencesHydrated(true);
  }, []);

  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }

    writeDashboardFilterPreferences({
      activeCategory,
      statusFilter,
      selectedProviderIds,
    });
  }, [activeCategory, preferencesHydrated, selectedProviderIds, statusFilter]);

  const selectedProviderIdSet =
    selectedProviderIds.length > 0 ? new Set(selectedProviderIds) : null;
  const statuses = PROVIDER_CATEGORIES.flatMap((category) => categoryStatuses[category.id] ?? []);
  const lastUpdatedTimestamp = statuses.reduce((latest, status) => {
    const value = Date.parse(status.lastUpdated);
    return Number.isNaN(value) ? latest : Math.max(latest, value);
  }, 0);
  const lastUpdated = statuses.length > 0 ? new Date(lastUpdatedTimestamp || Date.now()) : null;
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const serviceScopedProviders = (
    activeCategory === 'all' ? PROVIDERS : getProvidersByCategory(activeCategory)
  ).filter((provider) => !selectedProviderIdSet || selectedProviderIdSet.has(provider.id));
  const serviceScopedStatuses = statuses.filter((status) => {
    const provider = getProviderConfig(status.id);

    if (activeCategory !== 'all' && provider.category !== activeCategory) {
      return false;
    }

    if (selectedProviderIdSet && !selectedProviderIdSet.has(status.id)) {
      return false;
    }

    return matchesSearchQuery(status, normalizedQuery);
  });
  const filteredStatuses = serviceScopedStatuses.filter((status) =>
    matchesStatusFilter(status, statusFilter)
  );
  const relevantCategories =
    activeCategory === 'all'
      ? PROVIDER_CATEGORIES.map((category) => category.id)
      : [activeCategory];
  const pendingRelevantCategories = relevantCategories.filter((category) => {
    if (categoryStatuses[category] !== null) {
      return false;
    }

    if (!selectedProviderIdSet) {
      return true;
    }

    return getProvidersByCategory(category).some((provider) => selectedProviderIdSet.has(provider.id));
  });
  const pendingProviderCount = PROVIDER_CATEGORIES.reduce((total, category) => {
    if (categoryStatuses[category.id] !== null) {
      return total;
    }

    if (activeCategory !== 'all' && category.id !== activeCategory) {
      return total;
    }

    return (
      total +
      getProvidersByCategory(category.id).filter(
        (provider) => !selectedProviderIdSet || selectedProviderIdSet.has(provider.id)
      ).length
    );
  }, 0);
  const error = Object.values(categoryErrors)[0] ?? null;
  const providerScopeCount = serviceScopedProviders.length;
  const operationalCount = getStatusCount(serviceScopedStatuses, 'operational');
  const nonOperationalCount = serviceScopedStatuses.filter((status) =>
    isNonOperationalStatus(status.status)
  ).length;
  const unknownCount = getStatusCount(serviceScopedStatuses, 'unknown');
  const visibleProviderGroups = (
    activeCategory === 'all'
      ? PROVIDER_CATEGORIES
      : PROVIDER_CATEGORIES.filter((category) => category.id === activeCategory)
  ).map((category) => ({
    ...category,
    providers: getProvidersByCategory(category.id),
  }));

  const toggleStatusFilter = (nextFilter: StatusFilter) => {
    setStatusFilter((current) => (current === nextFilter ? 'all' : nextFilter));
  };

  const toggleProviderSelection = (providerId: string) => {
    setSelectedProviderIds((current) => {
      if (current.length === 0) {
        return [providerId];
      }

      if (current.includes(providerId)) {
        return current.filter((id) => id !== providerId);
      }

      return [...current, providerId];
    });
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[0_26px_90px_rgba(2,10,28,0.38)] backdrop-blur xl:p-8">
          <PageHeader lastUpdated={lastUpdated} />

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative block w-full xl:max-w-2xl">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]/70"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Search providers, statuses, ids, or summaries"
                className="w-full rounded-full border border-[var(--panel-border)] bg-[var(--toolbar)] py-3 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-[var(--muted)]/40 focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                aria-label="Search providers"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                  }}
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsServiceFilterOpen((current) => !current);
                }}
                aria-expanded={isServiceFilterOpen}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--toolbar)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)] transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filter
                {selectedProviderIds.length > 0 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-sky-100">
                    {selectedProviderIds.length} services
                  </span>
                )}
                {isServiceFilterOpen ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {CATEGORY_FILTERS.map((filter) => {
                const isActive = activeCategory === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(filter.id);
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${
                      isActive
                        ? 'border-sky-300/40 bg-sky-400/12 text-sky-200'
                        : 'border-[var(--panel-border)] bg-[var(--toolbar)] text-[var(--muted)] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isServiceFilterOpen && (
            <section className="mt-5 rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--toolbar)]/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-200">
                    Service Scope
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Choose one or more providers to narrow the board. Leaving everything
                    unselected keeps the full dashboard visible, and your filter choices persist in
                    a browser cookie.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProviderIds([]);
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${
                      selectedProviderIds.length === 0
                        ? 'border-sky-300/40 bg-sky-400/12 text-sky-200'
                        : 'border-[var(--panel-border)] bg-[var(--panel)] text-[var(--muted)] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    All Services
                  </button>
                  {selectedProviderIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProviderIds([]);
                      }}
                      className="rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {visibleProviderGroups.map((group) => (
                  <section key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/90">
                        {group.label}
                      </h2>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                        {group.providers.length} providers
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.providers.map((provider) => {
                        const isSelected = selectedProviderIds.includes(provider.id);

                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => {
                              toggleProviderSelection(provider.id);
                            }}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${
                              isSelected
                                ? 'border-sky-300/40 bg-sky-400/12 text-sky-100'
                                : 'border-[var(--panel-border)] bg-[var(--panel)] text-[var(--muted)] hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {provider.name}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setIsServiceFilterOpen((current) => !current);
              }}
              aria-expanded={isServiceFilterOpen}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--toolbar)] px-4 py-2 text-sm text-[var(--subtle)] transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              <LayoutList className="h-4 w-4 text-sky-300" aria-hidden="true" />
              Showing {filteredStatuses.length} of {providerScopeCount}
              {isServiceFilterOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                toggleStatusFilter('operational');
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${
                statusFilter === 'operational'
                  ? 'border-emerald-300/40 bg-emerald-400/18 text-emerald-100'
                  : 'border-emerald-400/18 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/35 hover:text-emerald-100'
              }`}
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              {operationalCount} operational
            </button>
            <button
              type="button"
              onClick={() => {
                toggleStatusFilter('nonOperational');
              }}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${
                statusFilter === 'nonOperational'
                  ? 'border-amber-300/40 bg-amber-400/18 text-amber-100'
                  : 'border-amber-400/18 bg-amber-400/10 text-amber-200 hover:border-amber-300/35 hover:text-amber-100'
              }`}
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              {nonOperationalCount} non-operational
            </button>
            {unknownCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/15 bg-slate-300/10 px-4 py-2 text-sm text-slate-200">
                {unknownCount} unknown
              </div>
            )}
            {pendingProviderCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/10 px-4 py-2 text-sm text-sky-100">
                {pendingProviderCount} loading
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-[1.5rem] border border-[var(--error-border)] bg-[var(--error-bg)] p-4">
            <p className="text-sm text-[var(--error-text)]">{error}</p>
            <button
              onClick={() => {
                void fetchStatuses();
              }}
              className="mt-3 inline-flex items-center rounded-full border border-[var(--error-border)] px-4 py-2 text-sm font-medium text-[var(--error-text)] transition hover:border-[var(--focus-ring)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              Retry
            </button>
          </div>
        )}

        {statuses.length === 0 ? (
          <LoadingList />
        ) : filteredStatuses.length === 0 && pendingRelevantCategories.length > 0 ? (
          <LoadingList categories={pendingRelevantCategories} />
        ) : filteredStatuses.length === 0 ? (
          <section className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--list-surface)] p-8 text-center shadow-[0_26px_90px_rgba(2,10,28,0.36)]">
            <p className="font-headline text-2xl font-semibold tracking-[-0.04em] text-white">
              No providers matched that filter
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Try a different provider name, status keyword, or category filter. Searches match
              provider ids, names, summaries, and current status labels.
            </p>
          </section>
        ) : (
          <StatusGrid statuses={filteredStatuses} />
        )}
      </div>
    </main>
  );
}
