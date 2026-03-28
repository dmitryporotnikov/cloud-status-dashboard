import * as cheerio from 'cheerio';
import { NormalizedStatus } from '../types';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { createUnknownStatus, normalizeDescription } from '../normalize';
import { classifyByKeywords } from '../keywords';
import { fetchTextWithTimeout, normalizeText } from '../utils';

const RESOLVED_PREFIX = /^\s*(resolved|recovered|restored|completed)\b/i;

export async function fetchIBMStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('ibm');

  try {
    const xml = await fetchTextWithTimeout(
      'https://cloud.ibm.com/status/api/notifications/feed.rss',
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

    const activeItem = items
      .toArray()
      .map((item) => {
        const element = $(item);
        return {
          title: element.find('title').text() || '',
          description: element.find('description').text() || '',
        };
      })
      .find((item) => !RESOLVED_PREFIX.test(normalizeText(item.title)));

    if (!activeItem) {
      return {
        id: config.id,
        name: config.name,
        status: 'operational',
        description: 'All systems operational',
        link: config.link,
        lastUpdated: new Date().toISOString(),
      };
    }

    const title = activeItem.title;
    const description = activeItem.description;
    const normalizedTitle = normalizeText(title);
    const status = classifyByKeywords(normalizeText(`${normalizedTitle} ${description}`));

    return {
      id: config.id,
      name: config.name,
      status,
      description: normalizeDescription(
        normalizedTitle.replace(RESOLVED_PREFIX, '').replace(/^:\s*/, ''),
        'All systems operational'
      ),
      link: config.link,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
