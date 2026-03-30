import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchAtlassianStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('atlassian', 'https://status.atlassian.com/api/v2/summary.json');
}
