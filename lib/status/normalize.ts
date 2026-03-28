import { ProviderStatus, NormalizedStatus, ProviderConfig } from './types';

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
  const description = text?.replace(/\s+/g, ' ').trim();

  return description ? description : fallback;
}
