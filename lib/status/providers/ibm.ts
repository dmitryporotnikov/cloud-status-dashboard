import * as cheerio from 'cheerio';
import { NormalizedStatus } from '../types';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import {
  createUnknownStatus,
  getPrimaryDescription,
  getWorstStatus,
  normalizeNotifications,
} from '../normalize';
import { classifyByKeywords } from '../keywords';
import { fetchTextWithTimeout, normalizeText } from '../utils';

const RESOLVED_PREFIX = /^\s*(resolved|recovered|restored|completed)\b/i;
const ACTIONABLE_IBM_SELECTED_VIEWS = new Set(['history']);

function getIBMFeedSelection(link: string): string {
  const selectedMatch = link.match(/[?&]selected=([^&]+)/i);

  if (!selectedMatch) {
    return '';
  }

  try {
    return decodeURIComponent(selectedMatch[1]).toLowerCase();
  } catch {
    return selectedMatch[1].toLowerCase();
  }
}

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

    const activeItems = items
      .toArray()
      .map((item) => {
        const element = $(item);
        return {
          title: element.find('title').text() || '',
          description: element.find('description').text() || '',
          link: element.find('link').text() || '',
        };
      })
      .filter((item) => ACTIONABLE_IBM_SELECTED_VIEWS.has(getIBMFeedSelection(item.link)))
      .filter((item) => !RESOLVED_PREFIX.test(normalizeText(item.title)));

    if (activeItems.length === 0) {
      return {
        id: config.id,
        name: config.name,
        status: 'operational',
        description: 'All systems operational',
        link: config.link,
        lastUpdated: new Date().toISOString(),
      };
    }

    const notifications = normalizeNotifications(
      activeItems.map((item) =>
        normalizeText(item.title).replace(RESOLVED_PREFIX, '').replace(/^:\s*/, '')
      )
    );
    const status = getWorstStatus(
      activeItems.map((item) => {
        const normalizedTitle = normalizeText(item.title);
        const classified = classifyByKeywords(normalizeText(`${normalizedTitle} ${item.description}`));

        return classified === 'operational' || classified === 'unknown' ? 'degraded' : classified;
      }),
      'degraded'
    );

    return {
      id: config.id,
      name: config.name,
      status,
      description: getPrimaryDescription(notifications, 'Active incidents detected'),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
