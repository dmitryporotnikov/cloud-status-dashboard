import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchLinodeStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('linode', 'https://status.linode.com/api/v2/summary.json');
}
