import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchVercelStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('vercel', 'https://www.vercel-status.com/api/v2/summary.json');
}
