import { NormalizedStatus } from '../types';
import { fetchStatuspageSummaryStatus } from './statuspage-utils';

export async function fetchTwilioStatus(): Promise<NormalizedStatus> {
  return fetchStatuspageSummaryStatus('twilio', 'https://status.twilio.com/api/v2/summary.json');
}
