import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchAkamaiStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('akamai', 'https://status.akamai.com/api/v2/summary.json');
}
