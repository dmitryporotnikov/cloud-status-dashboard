import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';
import { createUnknownStatus, normalizeDescription } from '../normalize';
import { NormalizedStatus, ProviderStatus } from '../types';
import { fetchJsonWithTimeout, normalizeText } from '../utils';

interface SlackIncident {
  details?: string;
  note?: string;
  service_name?: string;
  status?: string;
  title?: string;
  type?: string;
}

interface SlackCurrentStatusResponse {
  active_incidents?: SlackIncident[];
  date_created?: string;
  date_updated?: string;
  status?: string;
}

function getSlackIncidentSummary(incident: SlackIncident | undefined): string {
  const parts = [
    normalizeText(incident?.title),
    normalizeText(incident?.type),
    normalizeText(incident?.service_name),
    normalizeText(incident?.details),
    normalizeText(incident?.note),
    normalizeText(incident?.status),
  ].filter(Boolean);

  return parts.join(' - ');
}

function getSlackStatus(response: SlackCurrentStatusResponse, summary: string): ProviderStatus {
  if (summary) {
    const classified = classifyByKeywords(summary);

    if (classified !== 'operational') {
      return classified;
    }

    return 'degraded';
  }

  const currentStatus = normalizeText(response.status).toLowerCase();

  if (currentStatus === 'ok') {
    return 'operational';
  }

  if (currentStatus.includes('maintenance')) {
    return 'maintenance';
  }

  if (currentStatus.includes('issue') || currentStatus.includes('active')) {
    return 'degraded';
  }

  return 'unknown';
}

export async function fetchSlackStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('slack');

  try {
    const response = await fetchJsonWithTimeout<SlackCurrentStatusResponse>(
      'https://slack-status.com/api/v2.0.0/current',
      {},
      PROVIDER_TIMEOUT_MS
    );
    const activeIncident = response.active_incidents?.[0];
    const summary = getSlackIncidentSummary(activeIncident);

    return {
      id: config.id,
      name: config.name,
      status: getSlackStatus(response, summary),
      description: summary
        ? normalizeDescription(summary, 'Active incident detected')
        : normalizeDescription(
            normalizeText(response.status).toLowerCase() === 'ok'
              ? 'All systems operational'
              : response.status,
            'All systems operational'
          ),
      link: config.link,
      lastUpdated:
        normalizeText(response.date_updated) ||
        normalizeText(response.date_created) ||
        new Date().toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
