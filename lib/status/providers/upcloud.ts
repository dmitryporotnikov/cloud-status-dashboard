import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchUpCloudStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('upcloud', 'https://status.upcloud.com/api/v2/summary.json');
}
