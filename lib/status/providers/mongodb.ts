import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchMongoDBStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('mongodb', 'https://status.mongodb.com/api/v2/summary.json');
}
