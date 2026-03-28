import { NormalizedStatus } from '../types';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { createManualCheckStatus, normalizeDescription } from '../normalize';
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

    const currentEvent = activeEvents[0];
    const summary = normalizeText(currentEvent.title);
    const eventType = normalizeText(currentEvent.eventType).toLowerCase();

    let status = classifyByKeywords(summary);

    if (eventType.includes('maint')) {
      status = 'maintenance';
    } else if (status === 'operational') {
      status = 'degraded';
    }

    return {
      id: config.id,
      name: config.name,
      status,
      description: normalizeDescription(summary, 'Active incidents detected'),
      link: config.link,
      lastUpdated: new Date(
        currentEvent.lastUpdateTime ?? currentEvent.startTime ?? Date.now()
      ).toISOString(),
    };
  } catch {
    return createManualCheckStatus(config);
  }
}
