import * as cheerio from 'cheerio';
import { NormalizedStatus } from '../types';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { createUnknownStatus, normalizeDescription } from '../normalize';
import { classifyByKeywords } from '../keywords';
import { fetchTextWithTimeout, normalizeText } from '../utils';

export async function fetchAzureStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('azure');

  try {
    const xml = await fetchTextWithTimeout(
      'https://azure.status.microsoft/en-us/status/feed/',
      {},
      PROVIDER_TIMEOUT_MS
    );
    const $ = cheerio.load(xml, { xmlMode: true });

    const items = $('item');
    if (items.length === 0) {
      return {
        id: config.id,
        name: config.name,
        status: 'operational',
        description: 'All systems operational',
        link: config.link,
        lastUpdated: new Date().toISOString(),
      };
    }

    const firstItem = items.first();
    const title = firstItem.find('title').text() || '';
    const description = firstItem.find('description').text() || '';
    const status = classifyByKeywords(normalizeText(`${title} ${description}`));

    return {
      id: config.id,
      name: config.name,
      status,
      description: normalizeDescription(title, 'All systems operational'),
      link: config.link,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
