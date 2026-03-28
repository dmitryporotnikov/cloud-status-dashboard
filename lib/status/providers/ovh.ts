import { NormalizedStatus } from '../types';
import { fetchJsonWithTimeout } from '../utils';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { createManualCheckStatus, mapStatuspageIndicator, normalizeDescription } from '../normalize';

interface OVHStatuspageResponse {
  status?: {
    description?: string;
    indicator?: string;
  };
}

export async function fetchOVHStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('ovh');

  try {
    const response = await fetchJsonWithTimeout<OVHStatuspageResponse>(
      'https://public-cloud.status-ovhcloud.com/api/v2/status.json',
      {},
      PROVIDER_TIMEOUT_MS
    );

    return {
      id: config.id,
      name: config.name,
      status: mapStatuspageIndicator(response.status?.indicator),
      description: normalizeDescription(response.status?.description, 'All systems operational'),
      link: config.link,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return createManualCheckStatus(config);
  }
}
