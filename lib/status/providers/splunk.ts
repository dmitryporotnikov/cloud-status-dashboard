import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchSplunkStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus(
    'splunk',
    'https://status.splunkcloud.com/api/v2/summary.json'
  );
}
