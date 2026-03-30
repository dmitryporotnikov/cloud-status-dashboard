import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';
import { createUnknownStatus, mapStatuspageIndicator, normalizeDescription } from '../normalize';
import { NormalizedStatus, ProviderStatus } from '../types';
import { fetchJsonWithTimeout, normalizeText } from '../utils';

interface StatuspageUpdate {
  body?: string;
}

interface StatuspageEntry {
  impact?: string;
  incident_updates?: StatuspageUpdate[];
  name?: string;
  scheduled_for?: string;
  scheduled_until?: string;
  status?: string;
  updated_at?: string;
}

interface StatuspageSummaryResponse {
  page?: {
    updated_at?: string;
  };
  scheduled_maintenances?: StatuspageEntry[];
  incidents?: StatuspageEntry[];
  status?: {
    description?: string;
    indicator?: string;
  };
}

const RESOLVED_INCIDENT_STATUSES = new Set(['closed', 'completed', 'postmortem', 'resolved']);
const ACTIVE_MAINTENANCE_STATUSES = new Set(['in_progress', 'verifying']);

function getLatestStatuspageUpdate(entry: StatuspageEntry): string {
  const updates = entry.incident_updates ?? [];

  for (let index = updates.length - 1; index >= 0; index -= 1) {
    const message = normalizeText(updates[index]?.body);

    if (message) {
      return message;
    }
  }

  return '';
}

function getStatuspageEntrySummary(entry: StatuspageEntry): string {
  return normalizeText(entry.name) || getLatestStatuspageUpdate(entry);
}

function isResolvedStatuspageIncident(entry: StatuspageEntry): boolean {
  return RESOLVED_INCIDENT_STATUSES.has(normalizeText(entry.status).toLowerCase());
}

function isActiveStatuspageMaintenance(entry: StatuspageEntry): boolean {
  const status = normalizeText(entry.status).toLowerCase();

  if (ACTIVE_MAINTENANCE_STATUSES.has(status)) {
    return true;
  }

  const start = Date.parse(entry.scheduled_for ?? '');
  const end = Date.parse(entry.scheduled_until ?? '');
  const now = Date.now();

  return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && now <= end;
}

function getIncidentStatus(entry: StatuspageEntry): ProviderStatus {
  const mappedImpact = mapStatuspageIndicator(entry.impact);

  if (mappedImpact !== 'unknown' && mappedImpact !== 'operational') {
    return mappedImpact;
  }

  const classified = classifyByKeywords(getStatuspageEntrySummary(entry));
  return classified === 'operational' ? 'degraded' : classified;
}

export async function fetchStatuspageSummaryStatus(
  providerId: string,
  summaryUrl: string
): Promise<NormalizedStatus> {
  const config = getProviderConfig(providerId);

  try {
    const response = await fetchJsonWithTimeout<StatuspageSummaryResponse>(
      summaryUrl,
      {},
      PROVIDER_TIMEOUT_MS
    );
    const activeIncident = response.incidents?.find(
      (incident) => !isResolvedStatuspageIncident(incident)
    );
    const activeMaintenance = response.scheduled_maintenances?.find(isActiveStatuspageMaintenance);

    let status = mapStatuspageIndicator(response.status?.indicator);

    if (activeIncident) {
      status = getIncidentStatus(activeIncident);
    } else if (activeMaintenance) {
      status = 'maintenance';
    } else if (status === 'unknown') {
      const fallbackText = normalizeText(response.status?.description);
      status = fallbackText ? classifyByKeywords(fallbackText) : 'unknown';
    }

    const description = activeIncident
      ? normalizeDescription(
          getStatuspageEntrySummary(activeIncident),
          normalizeDescription(response.status?.description, 'Active incident detected')
        )
      : activeMaintenance
        ? normalizeDescription(
            getStatuspageEntrySummary(activeMaintenance),
            normalizeDescription(response.status?.description, 'Active maintenance detected')
          )
        : normalizeDescription(response.status?.description, 'All systems operational');

    return {
      id: config.id,
      name: config.name,
      status,
      description,
      link: config.link,
      lastUpdated:
        normalizeText(activeIncident?.updated_at) ||
        normalizeText(activeMaintenance?.updated_at) ||
        normalizeText(response.page?.updated_at) ||
        new Date().toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
