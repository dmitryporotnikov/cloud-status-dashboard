import type { ProviderStatus, NormalizedStatus, ProviderConfig } from './types.ts';

const STATUS_PRIORITY: Record<ProviderStatus, number> = {
  unknown: 0,
  operational: 1,
  maintenance: 2,
  degraded: 3,
  outage: 4,
};

function cleanText(text: string | null | undefined): string {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

// Map Statuspage-style API status indicators to our ProviderStatus
export function mapStatuspageIndicator(indicator: string | null | undefined): ProviderStatus {
  switch (indicator) {
    case 'none':
      return 'operational';
    case 'minor':
      return 'degraded';
    case 'major':
    case 'critical':
      return 'outage';
    case 'maintenance':
      return 'maintenance';
    default:
      return 'unknown';
  }
}

// Create a fallback unknown status result
export function createUnknownStatus(config: ProviderConfig): NormalizedStatus {
  return {
    id: config.id,
    name: config.name,
    status: 'unknown',
    description: 'Unable to fetch current status',
    link: config.link,
    lastUpdated: new Date().toISOString(),
  };
}

export function createManualCheckStatus(config: ProviderConfig): NormalizedStatus {
  return {
    ...createUnknownStatus(config),
    description: 'Requires manual check',
  };
}

export function normalizeDescription(
  text: string | null | undefined,
  fallback: string
): string {
  const description = cleanText(text);

  return description ? description : fallback;
}

export function normalizeNotifications(
  notifications: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const notification of notifications) {
    const text = cleanText(notification);
    const key = text.toLowerCase();

    if (!text || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(text);
  }

  return normalized;
}

export function getPrimaryDescription(
  notifications: string[],
  fallback: string
): string {
  return notifications[0] ?? fallback;
}

export function getWorstStatus(
  statuses: ProviderStatus[],
  fallback: ProviderStatus = 'unknown'
): ProviderStatus {
  let worstStatus = fallback;
  let worstPriority = STATUS_PRIORITY[fallback];

  for (const status of statuses) {
    const priority = STATUS_PRIORITY[status];

    if (priority > worstPriority) {
      worstStatus = status;
      worstPriority = priority;
    }
  }

  return worstStatus;
}

export function getLatestTimestamp(
  timestamps: Array<string | null | undefined>,
  fallback = new Date().toISOString()
): string {
  let latestTimestamp = '';
  let latestValue = Number.NEGATIVE_INFINITY;

  for (const timestamp of timestamps) {
    const normalizedTimestamp = cleanText(timestamp);
    const value = Date.parse(normalizedTimestamp);

    if (!Number.isNaN(value) && value > latestValue) {
      latestTimestamp = new Date(value).toISOString();
      latestValue = value;
    }
  }

  if (latestTimestamp) {
    return latestTimestamp;
  }

  const normalizedFallback = cleanText(fallback) || new Date().toISOString();
  const fallbackValue = Date.parse(normalizedFallback);

  return Number.isNaN(fallbackValue) ? new Date().toISOString() : new Date(fallbackValue).toISOString();
}
