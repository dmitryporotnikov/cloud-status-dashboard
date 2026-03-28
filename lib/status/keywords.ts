import { ProviderStatus } from './types';

export const STATUS_KEYWORDS: Record<ProviderStatus, string[]> = {
  maintenance: ['maintenance', 'planned maintenance', 'scheduled maintenance', 'scheduled work'],
  degraded: [
    'degraded',
    'degradation',
    'latency',
    'performance',
    'partial',
    'limited',
    'issue',
    'issues',
    'error rates',
    'connectivity',
  ],
  outage: ['outage', 'down', 'unavailable', 'service disruption', 'major incident', 'widespread'],
  operational: ['operational', 'normal', 'all clear'],
  unknown: [],
};

const RESOLVED_KEYWORDS = [
  'resolved',
  'restored',
  'recovered',
  'completed',
  'complete',
  'closed',
  'mitigated',
];

const ACTIVE_KEYWORDS = [
  'ongoing',
  'investigating',
  'monitoring',
  'identified',
  'in progress',
  'active',
];

export function classifyByKeywords(text: string): ProviderStatus {
  const lower = text.toLowerCase();
  const hasResolvedKeyword = RESOLVED_KEYWORDS.some((keyword) => lower.includes(keyword));
  const hasActiveKeyword = ACTIVE_KEYWORDS.some((keyword) => lower.includes(keyword));

  if (hasResolvedKeyword && !hasActiveKeyword) {
    return 'operational';
  }

  for (const keyword of STATUS_KEYWORDS.maintenance) {
    if (lower.includes(keyword)) return 'maintenance';
  }

  for (const keyword of STATUS_KEYWORDS.outage) {
    if (lower.includes(keyword)) return 'outage';
  }

  for (const keyword of STATUS_KEYWORDS.degraded) {
    if (lower.includes(keyword)) return 'degraded';
  }

  return 'operational';
}
