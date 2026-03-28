import { NormalizedStatus } from '../types';
import { fetchJsonWithTimeout } from '../utils';
import { mapStatuspageIndicator, createUnknownStatus, normalizeDescription } from '../normalize';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';

interface StatuspageResponse {
  page?: {
    id: string;
    name: string;
    url: string;
  };
  status: {
    indicator: string;
    description: string;
  };
}

export async function fetchCloudflareStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('cloudflare');

  try {
    const response = await fetchJsonWithTimeout<StatuspageResponse>(
      'https://www.cloudflarestatus.com/api/v2/status.json',
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
    return createUnknownStatus(config);
  }
}
