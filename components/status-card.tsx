'use client';

import { useState } from 'react';
import Image from 'next/image';
import { NormalizedStatus, ProviderStatus } from '@/lib/status/types';
import { getProviderConfig, PROVIDER_CATEGORIES } from '@/lib/status/constants';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';

interface StatusCardProps {
  status: NormalizedStatus;
}

const categoryLabels = Object.fromEntries(
  PROVIDER_CATEGORIES.map((category) => [category.id, category.label])
);

const statusConfig: Record<
  ProviderStatus,
  {
    icon: React.ElementType;
    badgeClassName: string;
    color: string;
    label: string;
  }
> = {
  operational: {
    icon: CheckCircle2,
    badgeClassName: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    color: 'text-emerald-300',
    label: 'Operational',
  },
  degraded: {
    icon: AlertTriangle,
    badgeClassName: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    color: 'text-amber-300',
    label: 'Degraded',
  },
  outage: {
    icon: XCircle,
    badgeClassName: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    color: 'text-rose-300',
    label: 'Outage',
  },
  maintenance: {
    icon: Wrench,
    badgeClassName: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    color: 'text-sky-300',
    label: 'Maintenance',
  },
  unknown: {
    icon: HelpCircle,
    badgeClassName: 'border-slate-300/15 bg-slate-300/10 text-slate-300',
    color: 'text-slate-300',
    label: 'Unknown',
  },
};

function getProviderInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProviderAvatar({ id, name }: { id: string; name: string }) {
  const [hasIcon, setHasIcon] = useState(true);

  return (
    <span className="font-headline flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-sm font-semibold tracking-[0.18em] text-sky-200">
      {hasIcon ? (
        <Image
          src={`/provider-icons/${id}.png`}
          alt=""
          className="h-8 w-8 object-contain"
          height={32}
          width={32}
          unoptimized
          onError={() => {
            setHasIcon(false);
          }}
        />
      ) : (
        getProviderInitials(name)
      )}
    </span>
  );
}

export function StatusCard({ status }: StatusCardProps) {
  const config = statusConfig[status.status];
  const providerConfig = getProviderConfig(status.id);
  const categoryLabel = categoryLabels[providerConfig.category] ?? providerConfig.category.toUpperCase();
  const Icon = config.icon;
  const formattedTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(status.lastUpdated));

  return (
    <a
      href={status.link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${status.name}: ${config.label}. View official status page in a new tab.`}
      className="group grid grid-cols-1 gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--list-row)] px-4 py-4 transition duration-200 hover:border-[var(--card-border-strong)] hover:bg-[var(--list-row-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] md:grid-cols-[minmax(0,2.8fr)_minmax(0,1.2fr)_minmax(0,3.4fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-6 md:px-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        <ProviderAvatar id={status.id} name={status.name} />
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white md:text-lg">{status.name}</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {categoryLabel}
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]/80">
            {status.id}
          </p>
        </div>
      </div>

      <div className="flex items-center md:justify-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${config.badgeClassName}`}
        >
          <Icon className={`h-4 w-4 ${config.color}`} aria-hidden="true" />
          {config.label}
        </span>
      </div>

      <p className="line-clamp-2 text-sm leading-6 text-[var(--subtle)] md:pr-4">
        {status.description}
      </p>

      <p className="text-xs text-[var(--muted)] md:text-right">Updated {formattedTime}</p>

      <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-200 transition group-hover:text-sky-100 md:justify-end">
        Open
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </a>
  );
}
