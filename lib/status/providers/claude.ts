import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchClaudeStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('claude', 'https://status.claude.com/api/v2/summary.json');
}
