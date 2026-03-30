import { NormalizedStatus } from '../types';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import {
  createManualCheckStatus,
  getLatestTimestamp,
  getPrimaryDescription,
  getWorstStatus,
  normalizeNotifications,
} from '../normalize';
import { classifyByKeywords } from '../keywords';
import { fetchJsonWithTimeout, normalizeText } from '../utils';

interface AlibabaStatusEvent {
  eventType?: string;
  id?: number;
  lastUpdateTime?: number;
  startTime?: number;
  title?: string;
}

interface AlibabaStatusResponse {
  data?: AlibabaStatusEvent[] | null;
  success?: boolean;
}

function getAlibabaEventStatus(event: AlibabaStatusEvent): 'degraded' | 'maintenance' | 'outage' {
  const summary = normalizeText(event.title);
  const eventType = normalizeText(event.eventType).toLowerCase();
  const classified = classifyByKeywords(summary);

  if (eventType.includes('maint')) {
    return 'maintenance';
  }

  if (classified === 'outage') {
    return 'outage';
  }

  return 'degraded';
}

export async function fetchAlibabaStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('alibaba');

  try {
    const response = await fetchJsonWithTimeout<AlibabaStatusResponse>(
      'https://status.alibabacloud.com/api/status/listEventInProgress',
      {},
      PROVIDER_TIMEOUT_MS
    );

    if (response.success === false) {
      return createManualCheckStatus(config);
    }

    const activeEvents = (response.data ?? []).slice().sort((left, right) => {
      return (right.lastUpdateTime ?? right.startTime ?? 0) - (left.lastUpdateTime ?? left.startTime ?? 0);
    });

    if (activeEvents.length === 0) {
      return {
        id: config.id,
        name: config.name,
        status: 'operational',
        description: 'All systems operational',
        link: config.link,
        lastUpdated: new Date().toISOString(),
      };
    }

    const notifications = normalizeNotifications(activeEvents.map((event) => event.title));

    return {
      id: config.id,
      name: config.name,
      status: getWorstStatus(activeEvents.map(getAlibabaEventStatus), 'degraded'),
      description: getPrimaryDescription(notifications, 'Active incidents detected'),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: getLatestTimestamp(
        activeEvents.map((event) =>
          event.lastUpdateTime || event.startTime
            ? new Date(event.lastUpdateTime ?? event.startTime ?? Date.now()).toISOString()
            : ''
        ),
        new Date().toISOString()
      ),
    };
  } catch {
    return createManualCheckStatus(config);
  }
}
