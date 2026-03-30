import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';
import { createUnknownStatus, normalizeDescription } from '../normalize';
import { NormalizedStatus, ProviderStatus } from '../types';
import { fetchJsonWithTimeout, normalizeText } from '../utils';

interface GoogleAffectedProduct {
  id?: string;
  title?: string;
}

interface GoogleIncidentUpdate {
  status?: string;
  text?: string;
  when?: string;
}

interface GoogleIncident {
  affected_products?: GoogleAffectedProduct[];
  end?: string;
  external_desc?: string;
  modified?: string;
  most_recent_update?: GoogleIncidentUpdate;
  service_name?: string;
  severity?: string;
  status_impact?: string;
  updates?: GoogleIncidentUpdate[];
}

interface FetchGoogleCloudStatusOptions {
  descriptionFallback?: string;
  productId?: string;
  productTitle?: string;
}

function getLatestGoogleIncidentUpdate(incident: GoogleIncident): GoogleIncidentUpdate | undefined {
  const updates = incident.updates ?? [];

  if (updates.length === 0) {
    return incident.most_recent_update;
  }

  return [...updates].sort((left, right) => {
    const leftTime = Date.parse(left.when ?? '') || 0;
    const rightTime = Date.parse(right.when ?? '') || 0;

    return rightTime - leftTime;
  })[0];
}

function mapGoogleIncidentStatus(incident: GoogleIncident): ProviderStatus {
  const update = getLatestGoogleIncidentUpdate(incident);
  const signal = update?.status ?? incident.status_impact;
  const summary = normalizeText(`${incident.external_desc ?? ''} ${update?.text ?? ''}`);

  if (signal === 'SERVICE_OUTAGE') {
    return 'outage';
  }

  if (signal === 'SERVICE_DISRUPTION') {
    return 'degraded';
  }

  if (signal === 'SERVICE_INFORMATION') {
    return classifyByKeywords(summary) === 'maintenance' ? 'maintenance' : 'degraded';
  }

  if (incident.severity === 'high') {
    return 'outage';
  }

  if (incident.severity === 'medium' || incident.severity === 'low') {
    return 'degraded';
  }

  return 'unknown';
}

function isActiveGoogleIncident(incident: GoogleIncident): boolean {
  const update = getLatestGoogleIncidentUpdate(incident);
  const signal = update?.status ?? incident.status_impact ?? 'AVAILABLE';

  return !normalizeText(incident.end) && signal !== 'AVAILABLE';
}

function matchesGoogleProduct(
  incident: GoogleIncident,
  options: Pick<FetchGoogleCloudStatusOptions, 'productId' | 'productTitle'>
): boolean {
  if (!options.productId && !options.productTitle) {
    return true;
  }

  const affectedProducts = incident.affected_products ?? [];

  if (options.productId && affectedProducts.some((product) => product.id === options.productId)) {
    return true;
  }

  if (
    options.productTitle &&
    affectedProducts.some((product) => normalizeText(product.title) === options.productTitle)
  ) {
    return true;
  }

  const haystack = normalizeText(
    `${incident.external_desc ?? ''} ${getLatestGoogleIncidentUpdate(incident)?.text ?? ''} ${
      incident.service_name ?? ''
    }`
  ).toLowerCase();

  return options.productTitle ? haystack.includes(options.productTitle.toLowerCase()) : false;
}

export async function fetchGoogleCloudStatus(
  providerId: string,
  options: FetchGoogleCloudStatusOptions = {}
): Promise<NormalizedStatus> {
  const config = getProviderConfig(providerId);

  try {
    const response = await fetchJsonWithTimeout<GoogleIncident[]>(
      'https://status.cloud.google.com/incidents.json',
      {},
      PROVIDER_TIMEOUT_MS
    );

    if (!Array.isArray(response) || response.length === 0) {
      return {
        id: config.id,
        name: config.name,
        status: 'operational',
        description: 'All systems operational',
        link: config.link,
        lastUpdated: new Date().toISOString(),
      };
    }

    const activeIncidents = response
      .filter(isActiveGoogleIncident)
      .filter((incident) => matchesGoogleProduct(incident, options))
      .sort((left, right) => {
        const leftTime =
          Date.parse(left.modified ?? getLatestGoogleIncidentUpdate(left)?.when ?? '') || 0;
        const rightTime =
          Date.parse(right.modified ?? getLatestGoogleIncidentUpdate(right)?.when ?? '') || 0;

        return rightTime - leftTime;
      });

    if (activeIncidents.length === 0) {
      return {
        id: config.id,
        name: config.name,
        status: 'operational',
        description: 'All systems operational',
        link: config.link,
        lastUpdated: new Date().toISOString(),
      };
    }

    const mostRelevantIncident = activeIncidents[0];
    const latestUpdate = getLatestGoogleIncidentUpdate(mostRelevantIncident);

    return {
      id: config.id,
      name: config.name,
      status: mapGoogleIncidentStatus(mostRelevantIncident),
      description: normalizeDescription(
        mostRelevantIncident.external_desc ?? latestUpdate?.text,
        options.descriptionFallback ?? 'Active incidents detected'
      ),
      link: config.link,
      lastUpdated: new Date(
        mostRelevantIncident.modified ?? latestUpdate?.when ?? new Date().toISOString()
      ).toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
