import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';
import { createUnknownStatus, normalizeDescription } from '../normalize';
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
    const incidents = response.incidents ?? [];
    const scheduledEvents = response.scheduled ?? [];
    const activeIncident = incidents[0];
    const activeMaintenance = scheduledEvents[0];
    const incidentSummary = getHerokuEventSummary(activeIncident);
    const maintenanceSummary = getHerokuEventSummary(activeMaintenance);
    const primarySystem = systems.find((system) => mapHerokuStatusColor(system.status ?? '') !== 'operational');
    let status = getWorstHerokuStatus(systems);

    if (activeIncident) {
      const classified = classifyByKeywords(
        normalizeText(`${incidentSummary} ${activeIncident.status ?? ''}`)
      );
      status = classified === 'operational' ? (status === 'operational' ? 'degraded' : status) : classified;
    } else if (activeMaintenance && status === 'operational') {
      status = 'maintenance';
    }

    return {
      id: config.id,
      name: config.name,
      status,
      description: activeIncident
        ? normalizeDescription(incidentSummary, 'Active incident detected')
        : activeMaintenance
          ? normalizeDescription(maintenanceSummary, 'Active maintenance detected')
          : primarySystem
            ? normalizeDescription(
                `${normalizeText(primarySystem.system)}: ${normalizeText(primarySystem.status)}`,
                'Service disruption detected'
              )
            : 'All systems operational',
      link: config.link,
      lastUpdated:
        normalizeText(activeIncident?.updated_at) ||
        normalizeText(activeMaintenance?.updated_at) ||
        normalizeText(activeIncident?.created_at) ||
        new Date().toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
