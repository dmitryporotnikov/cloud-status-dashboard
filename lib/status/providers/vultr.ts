import { NormalizedStatus } from '../types';
import { fetchJsonWithTimeout, normalizeText } from '../utils';
import {
  createUnknownStatus,
  getLatestTimestamp,
  getPrimaryDescription,
  getWorstStatus,
  normalizeNotifications,
} from '../normalize';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';

interface VultrAlertEntry {
  updated_at?: string;
  message?: string;
}

interface VultrAlert {
  status?: string;
  start_date?: string;
  subject?: string;
  updated_at?: string;
  entries?: VultrAlertEntry[];
}

interface VultrRegion {
  alerts?: VultrAlert[];
}

interface VultrStatusResponse {
  service_alerts?: VultrAlert[];
  regions?: Record<string, VultrRegion>;
}

function getScheduledVultrTimestamp(message: string | undefined, label: 'Start Time' | 'End Time'): number {
  const match = message?.match(
    new RegExp(`${label}:\\s*(\\d{4}-\\d{2}-\\d{2})\\s+(\\d{2}:\\d{2}:\\d{2})\\s+UTC`, 'i')
  );

  if (!match) {
    return Number.NaN;
  }

  return Date.parse(`${match[1]}T${match[2]}Z`);
}

function getVultrAlertTimestamp(alert: VultrAlert): string {
  return (
    alert.updated_at ||
    alert.entries?.find((entry) => entry.updated_at)?.updated_at ||
    alert.start_date ||
    new Date().toISOString()
  );
}

function getVultrAlertMessage(alert: VultrAlert): string {
  return normalizeText(
    alert.entries?.find((entry) => normalizeText(entry.message))?.message
  );
}

function getVultrAlertSummary(alert: VultrAlert): string {
  return normalizeText(`${alert.subject ?? ''} ${getVultrAlertMessage(alert)}`);
}

function getVultrAlertStatus(alert: VultrAlert): 'degraded' | 'maintenance' | 'outage' {
  const classified = classifyByKeywords(getVultrAlertSummary(alert));

  if (classified === 'outage' || classified === 'maintenance') {
    return classified;
  }

  return 'degraded';
}

function isActiveVultrAlert(alert: VultrAlert): boolean {
  if (normalizeText(alert.status).toLowerCase() !== 'ongoing') {
    return false;
  }

  const entryMessage = getVultrAlertMessage(alert);
  const summary = getVultrAlertSummary(alert).toLowerCase();

  if (!summary.includes('maintenance')) {
    return true;
  }

  const scheduledStart = getScheduledVultrTimestamp(entryMessage, 'Start Time');
  const scheduledEnd = getScheduledVultrTimestamp(entryMessage, 'End Time');
  const now = Date.now();

  if (!Number.isNaN(scheduledStart) && scheduledStart > now) {
    return false;
  }

  if (!Number.isNaN(scheduledEnd) && scheduledEnd < now) {
    return false;
  }

  return true;
}

export async function fetchVultrStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('vultr');

  try {
    const response = await fetchJsonWithTimeout<VultrStatusResponse>(
      'https://status.vultr.com/status.json',
      {},
      PROVIDER_TIMEOUT_MS
    );

    const activeAlerts = [
      ...(response.service_alerts ?? []),
      ...Object.values(response.regions ?? {}).flatMap((region) => region.alerts ?? []),
    ]
      .filter(isActiveVultrAlert)
      .sort((left, right) => {
        const leftTime = Date.parse(getVultrAlertTimestamp(left)) || 0;
        const rightTime = Date.parse(getVultrAlertTimestamp(right)) || 0;
        return rightTime - leftTime;
      });

    if (activeAlerts.length === 0) {
      return {
        id: config.id,
        name: config.name,
        status: 'operational',
        description: 'All systems operational',
        link: config.link,
        lastUpdated: new Date().toISOString(),
      };
    }

    const notifications = normalizeNotifications(activeAlerts.map(getVultrAlertSummary));

    return {
      id: config.id,
      name: config.name,
      status: getWorstStatus(activeAlerts.map(getVultrAlertStatus), 'degraded'),
      description: getPrimaryDescription(notifications, 'Active alerts detected'),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: getLatestTimestamp(
        activeAlerts.map(getVultrAlertTimestamp),
        new Date().toISOString()
      ),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
