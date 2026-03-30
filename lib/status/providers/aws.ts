import * as cheerio from 'cheerio';
import { NormalizedStatus, ProviderStatus } from '../types';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import {
  createUnknownStatus,
  getLatestTimestamp,
  getPrimaryDescription,
  getWorstStatus,
  normalizeNotifications,
} from '../normalize';
import { classifyByKeywords } from '../keywords';
import { fetchTextWithTimeout, normalizeText } from '../utils';

interface AWSStatusFeedItem {
  description: string;
  guid: string;
  pubDate: string;
  title: string;
}

function getAWSIncidentKey(item: AWSStatusFeedItem): string {
  const guid = normalizeText(item.guid);
  const guidFragment = guid.split('#')[1] ?? '';
  const keyFromGuid = guidFragment.split('_')[0];

  return keyFromGuid || normalizeText(item.title).toLowerCase();
}

function getAWSIncidentScope(key: string): string {
  const regionMatch = key.match(/([a-z]{2}(?:-[a-z]+)+-\d+)$/i);

  if (regionMatch) {
    return regionMatch[1].toUpperCase();
  }

  return '';
}

function getAWSIncidentSummary(item: AWSStatusFeedItem): string {
  const title = normalizeText(item.title);
  const scope = getAWSIncidentScope(getAWSIncidentKey(item));

  return scope ? `${scope}: ${title}` : title;
}

function getAWSIncidentStatus(item: AWSStatusFeedItem): ProviderStatus {
  const classified = classifyByKeywords(normalizeText(`${item.title} ${item.description}`));

  return classified === 'operational' || classified === 'unknown' ? 'degraded' : classified;
}

export async function fetchAWSStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('aws');

  try {
    const xml = await fetchTextWithTimeout(
      'https://status.aws.amazon.com/rss/all.rss',
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

    const latestItemsByIncident = new Map<string, AWSStatusFeedItem>();

    items.toArray().forEach((item) => {
      const element = $(item);
      const feedItem: AWSStatusFeedItem = {
        title: element.find('title').text() || '',
        description: element.find('description').text() || '',
        guid: element.find('guid').text() || '',
        pubDate: element.find('pubDate').text() || '',
      };
      const incidentKey = getAWSIncidentKey(feedItem);
      const existingItem = latestItemsByIncident.get(incidentKey);
      const existingTime = Date.parse(existingItem?.pubDate ?? '') || 0;
      const nextTime = Date.parse(feedItem.pubDate) || 0;

      if (!existingItem || nextTime >= existingTime) {
        latestItemsByIncident.set(incidentKey, feedItem);
      }
    });

    const activeIncidents = [...latestItemsByIncident.values()].sort((left, right) => {
      const leftTime = Date.parse(left.pubDate) || 0;
      const rightTime = Date.parse(right.pubDate) || 0;

      return rightTime - leftTime;
    });
    const notifications = normalizeNotifications(activeIncidents.map(getAWSIncidentSummary));

    return {
      id: config.id,
      name: config.name,
      status: getWorstStatus(activeIncidents.map(getAWSIncidentStatus), 'degraded'),
      description: getPrimaryDescription(notifications, 'Active incidents detected'),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: getLatestTimestamp(
        activeIncidents.map((incident) => incident.pubDate),
        new Date().toISOString()
      ),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
