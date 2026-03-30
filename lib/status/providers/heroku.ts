import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';
import {
  createUnknownStatus,
  getLatestTimestamp,
  getPrimaryDescription,
  getWorstStatus,
  normalizeDescription,
  normalizeNotifications,
} from '../normalize';
import { NormalizedStatus, ProviderStatus } from '../types';
import { fetchJsonWithTimeout, normalizeText } from '../utils';

interface HerokuSystemStatus {
  status?: string;
  system?: string;
}

interface HerokuEvent {
  created_at?: string;
  description?: string;
  status?: string;
  title?: string;
  updated_at?: string;
}

interface HerokuCurrentStatusResponse {
  incidents?: HerokuEvent[];
  scheduled?: HerokuEvent[];
  status?: HerokuSystemStatus[];
}

function mapHerokuStatusColor(color: string): ProviderStatus {
  switch (normalizeText(color).toLowerCase()) {
    case 'green':
      return 'operational';
    case 'yellow':
    case 'orange':
      return 'degraded';
    case 'red':
      return 'outage';
    case 'blue':
      return 'maintenance';
    default:
      return 'unknown';
  }
}

function getHerokuEventSummary(event: HerokuEvent | undefined): string {
  return normalizeText(event?.title) || normalizeText(event?.description);
}

function getHerokuEventTimestamp(event: HerokuEvent | undefined): string {
  return normalizeText(event?.updated_at) || normalizeText(event?.created_at);
}

function sortHerokuEvents(events: HerokuEvent[]): HerokuEvent[] {
  return [...events].sort((left, right) => {
    const leftTime = Date.parse(getHerokuEventTimestamp(left)) || 0;
    const rightTime = Date.parse(getHerokuEventTimestamp(right)) || 0;

    return rightTime - leftTime;
  });
}

function getHerokuIncidentStatus(event: HerokuEvent): ProviderStatus {
  const classified = classifyByKeywords(
    normalizeText(`${getHerokuEventSummary(event)} ${event.status ?? ''}`)
  );

  if (classified === 'outage' || classified === 'degraded' || classified === 'maintenance') {
    return classified;
  }

  return 'degraded';
}

function getWorstHerokuStatus(systems: HerokuSystemStatus[]): ProviderStatus {
  if (systems.length === 0) {
    return 'unknown';
  }

  const statuses = systems.map((system) => mapHerokuStatusColor(system.status ?? ''));

  if (statuses.includes('outage')) {
    return 'outage';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  if (statuses.includes('maintenance')) {
    return 'maintenance';
  }

  if (statuses.every((status) => status === 'operational')) {
    return 'operational';
  }

  return 'unknown';
}

export async function fetchHerokuStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('heroku');

  try {
    const response = await fetchJsonWithTimeout<HerokuCurrentStatusResponse>(
      'https://status.heroku.com/api/v4/current-status',
      {},
      PROVIDER_TIMEOUT_MS
    );
    const systems = response.status ?? [];
    const incidents = sortHerokuEvents(response.incidents ?? []);
    const scheduledEvents = sortHerokuEvents(response.scheduled ?? []);
    const primarySystem = systems.find(
      (system) => mapHerokuStatusColor(system.status ?? '') !== 'operational'
    );
    const systemStatus = getWorstHerokuStatus(systems);
    const notifications = normalizeNotifications([
      ...incidents.map(getHerokuEventSummary),
      ...scheduledEvents.map(getHerokuEventSummary),
    ]);
    const status = getWorstStatus(
      [
        systemStatus,
        ...incidents.map(getHerokuIncidentStatus),
        ...scheduledEvents.map(() => 'maintenance' as const),
      ],
      incidents.length > 0
        ? 'degraded'
        : scheduledEvents.length > 0
          ? 'maintenance'
          : systemStatus
    );

    return {
      id: config.id,
      name: config.name,
      status,
      description: getPrimaryDescription(
        notifications,
        incidents.length > 0
          ? 'Active incident detected'
          : scheduledEvents.length > 0
            ? 'Active maintenance detected'
            : primarySystem
              ? normalizeDescription(
                  `${normalizeText(primarySystem.system)}: ${normalizeText(primarySystem.status)}`,
                  'Service disruption detected'
                )
              : 'All systems operational'
      ),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: getLatestTimestamp(
        [...incidents.map(getHerokuEventTimestamp), ...scheduledEvents.map(getHerokuEventTimestamp)],
        new Date().toISOString()
      ),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
