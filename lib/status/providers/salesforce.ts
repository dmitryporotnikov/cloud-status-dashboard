import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';
import {
  createUnknownStatus,
  getLatestTimestamp,
  getPrimaryDescription,
  getWorstStatus,
  normalizeNotifications,
} from '../normalize';
import { NormalizedStatus, ProviderStatus } from '../types';
import { fetchJsonWithTimeout, normalizeText } from '../utils';

interface SalesforceImpact {
  severity?: string;
}

interface SalesforceEvent {
  message?: string;
}

interface SalesforceIncident {
  IncidentEvents?: SalesforceEvent[];
  IncidentImpacts?: SalesforceImpact[];
  additionalInformation?: string;
  createdAt?: string;
  status?: string;
  type?: string;
  updatedAt?: string;
}

interface SalesforceMaintenanceMessage {
  maintenanceType?: string;
}

interface SalesforceMaintenance {
  MaintenanceEvents?: SalesforceEvent[];
  additionalInformation?: string;
  createdAt?: string;
  message?: SalesforceMaintenanceMessage;
  name?: string;
  plannedEndTime?: string;
  plannedStartTime?: string;
  status?: string;
  type?: string;
  updatedAt?: string;
}

const SALESFORCE_CLOSED_STATUSES = new Set([
  'canceled',
  'cancelled',
  'closed',
  'completed',
  'resolved',
]);

function sortByUpdatedAt<T extends { updatedAt?: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt ?? '');
    const rightTime = Date.parse(right.updatedAt ?? '');

    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

function isOpenSalesforceItem(status: string | undefined): boolean {
  return !SALESFORCE_CLOSED_STATUSES.has(normalizeText(status).toLowerCase());
}

function isActiveSalesforceMaintenance(maintenance: SalesforceMaintenance): boolean {
  if (!isOpenSalesforceItem(maintenance.status)) {
    return false;
  }

  const start = Date.parse(maintenance.plannedStartTime ?? '');
  const end = Date.parse(maintenance.plannedEndTime ?? '');
  const now = Date.now();

  if (!Number.isNaN(start) && start > now) {
    return false;
  }

  if (!Number.isNaN(end) && end < now) {
    return false;
  }

  return true;
}

function getSalesforceEventSummary(message: SalesforceEvent | undefined): string {
  return normalizeText(message?.message);
}

function getSalesforceIncidentSummary(incident: SalesforceIncident): string {
  const latestEvent = incident.IncidentEvents?.find((event) => normalizeText(event.message));

  return (
    getSalesforceEventSummary(latestEvent) ||
    normalizeText(incident.additionalInformation) ||
    normalizeText(incident.type)
  );
}

function getSalesforceMaintenanceSummary(maintenance: SalesforceMaintenance): string {
  const latestEvent = maintenance.MaintenanceEvents?.find((event) => normalizeText(event.message));

  return (
    getSalesforceEventSummary(latestEvent) ||
    normalizeText(maintenance.name) ||
    normalizeText(maintenance.additionalInformation) ||
    normalizeText(maintenance.message?.maintenanceType) ||
    normalizeText(maintenance.type)
  );
}

function getSalesforceIncidentStatus(incident: SalesforceIncident): ProviderStatus {
  const severities =
    incident.IncidentImpacts?.map((impact) => normalizeText(impact.severity).toLowerCase()) ?? [];

  if (severities.some((severity) => severity === 'critical' || severity === 'major')) {
    return 'outage';
  }

  const classified = classifyByKeywords(
    normalizeText(`${incident.type ?? ''} ${getSalesforceIncidentSummary(incident)}`)
  );

  if (classified === 'operational') {
    return 'degraded';
  }

  return classified === 'maintenance' ? 'degraded' : classified;
}

export async function fetchSalesforceStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('salesforce');

  try {
    const [incidents, maintenances] = await Promise.all([
      fetchJsonWithTimeout<SalesforceIncident[]>(
        'https://api.status.salesforce.com/v1/incidents?limit=100',
        {},
        PROVIDER_TIMEOUT_MS
      ),
      fetchJsonWithTimeout<SalesforceMaintenance[]>(
        'https://api.status.salesforce.com/v1/maintenances?limit=100',
        {},
        PROVIDER_TIMEOUT_MS
      ),
    ]);
    const activeIncidents = sortByUpdatedAt(
      incidents.filter((incident) => isOpenSalesforceItem(incident.status))
    );
    const activeMaintenances = sortByUpdatedAt(
      maintenances.filter(isActiveSalesforceMaintenance)
    );
    const notifications = normalizeNotifications([
      ...activeIncidents.map(getSalesforceIncidentSummary),
      ...activeMaintenances.map(getSalesforceMaintenanceSummary),
    ]);

    return {
      id: config.id,
      name: config.name,
      status:
        activeIncidents.length > 0 || activeMaintenances.length > 0
          ? getWorstStatus(
              [
                ...activeIncidents.map(getSalesforceIncidentStatus),
                ...activeMaintenances.map(() => 'maintenance' as const),
              ],
              activeIncidents.length > 0 ? 'degraded' : 'maintenance'
            )
          : 'operational',
      description: getPrimaryDescription(
        notifications,
        activeIncidents.length > 0
          ? 'Active incident detected'
          : activeMaintenances.length > 0
            ? 'Active maintenance detected'
            : 'All systems operational'
      ),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: getLatestTimestamp(
        [
          ...activeIncidents.map((incident) => incident.updatedAt ?? incident.createdAt),
          ...activeMaintenances.map((maintenance) => maintenance.updatedAt ?? maintenance.createdAt),
        ],
        new Date().toISOString()
      ),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
