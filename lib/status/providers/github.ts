import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchGitHubStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('github', 'https://www.githubstatus.com/api/v2/summary.json');
}
