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

function getSlackResponseStatus(response: SlackCurrentStatusResponse): ProviderStatus {
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

function getSlackIncidentStatus(incident: SlackIncident): ProviderStatus {
  const classified = classifyByKeywords(getSlackIncidentSummary(incident));

  if (classified === 'outage' || classified === 'degraded' || classified === 'maintenance') {
    return classified;
  }

  return 'degraded';
}

export async function fetchSlackStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('slack');

  try {
    const response = await fetchJsonWithTimeout<SlackCurrentStatusResponse>(
      'https://slack-status.com/api/v2.0.0/current',
      {},
      PROVIDER_TIMEOUT_MS
    );
    const incidents = response.active_incidents ?? [];
    const notifications = normalizeNotifications(incidents.map(getSlackIncidentSummary));
    const responseStatus = getSlackResponseStatus(response);

    return {
      id: config.id,
      name: config.name,
      status:
        incidents.length > 0
          ? getWorstStatus(
              incidents.map(getSlackIncidentStatus),
              responseStatus === 'operational' ? 'degraded' : responseStatus
            )
          : responseStatus,
      description: getPrimaryDescription(
        notifications,
        normalizeDescription(
            normalizeText(response.status).toLowerCase() === 'ok'
              ? 'All systems operational'
              : response.status,
            'All systems operational'
          )
      ),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: getLatestTimestamp(
        [response.date_updated, response.date_created],
        new Date().toISOString()
      ),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
