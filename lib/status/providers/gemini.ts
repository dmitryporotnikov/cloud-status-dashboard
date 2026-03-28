import { NormalizedStatus } from '../types';
import { fetchGoogleCloudStatus } from './google-cloud-utils';

export async function fetchGeminiStatus(): Promise<NormalizedStatus> {
  return fetchGoogleCloudStatus('gemini', {
    descriptionFallback: 'Active Gemini incidents detected',
    productId: 'Z0FZJAMvEB4j3NbCJs6B',
    productTitle: 'Vertex Gemini API',
  });
}
