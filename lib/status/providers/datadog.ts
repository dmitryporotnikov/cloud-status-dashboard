import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchDatadogStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('datadog', 'https://status.datadoghq.com/api/v2/summary.json');
}
