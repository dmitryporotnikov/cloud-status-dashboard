import { NormalizedStatus } from '../types';
import { fetchGoogleCloudStatus } from './google-cloud-utils';

export async function fetchGCPStatus(): Promise<NormalizedStatus> {
  return fetchGoogleCloudStatus('gcp', {
    descriptionFallback: 'Active Google Cloud incidents detected',
  });
}
