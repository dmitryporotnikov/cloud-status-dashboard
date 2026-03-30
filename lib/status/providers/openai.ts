import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchOpenAIStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('openai', 'https://status.openai.com/api/v2/summary.json');
}
