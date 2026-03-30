import * as cheerio from 'cheerio';
import { getProviderConfig, PROVIDER_TIMEOUT_MS } from '../constants';
import { classifyByKeywords } from '../keywords';
import {
  createUnknownStatus,
  getPrimaryDescription,
  normalizeDescription,
  normalizeNotifications,
} from '../normalize';
import { NormalizedStatus, ProviderStatus } from '../types';
import { fetchTextWithTimeout, normalizeText } from '../utils';

interface GitLabComponentStatus {
  name: string;
  label: string;
  status: ProviderStatus;
}

function mapGitLabComponentStatus(label: string): ProviderStatus {
  const normalizedLabel = normalizeText(label).toLowerCase();

  if (!normalizedLabel) {
    return 'unknown';
  }

  if (normalizedLabel.includes('major outage')) {
    return 'outage';
  }

  if (normalizedLabel.includes('partial outage') || normalizedLabel.includes('degraded')) {
    return 'degraded';
  }

  if (normalizedLabel.includes('maintenance')) {
    return 'maintenance';
  }

  if (normalizedLabel.includes('operational')) {
    return 'operational';
  }

  return classifyByKeywords(normalizedLabel);
}

function getWorstGitLabStatus(components: GitLabComponentStatus[], statusbarText: string): ProviderStatus {
  if (components.some((component) => component.status === 'outage')) {
    return 'outage';
  }

  if (components.some((component) => component.status === 'degraded')) {
    return 'degraded';
  }

  if (components.some((component) => component.status === 'maintenance')) {
    return 'maintenance';
  }

  return classifyByKeywords(statusbarText);
}

export async function fetchGitLabStatus(): Promise<NormalizedStatus> {
  const config = getProviderConfig('gitlab');

  try {
    const html = await fetchTextWithTimeout('https://status.gitlab.com/', {}, PROVIDER_TIMEOUT_MS);
    const $ = cheerio.load(html);
    const statusbarText = normalizeText($('#statusbar_text').text());

    if (!statusbarText) {
      return createUnknownStatus(config);
    }

    const componentIssues = $('.component')
      .toArray()
      .map((component) => {
        const element = $(component);
        const name = normalizeText(
          element.find('.component_name').clone().children().remove().end().text()
        );
        const label = normalizeText(element.find('.component-status').text());
        const status = mapGitLabComponentStatus(label);

        return { name, label, status };
      })
      .filter((component) => component.status !== 'operational' && component.status !== 'unknown');
    const notifications = normalizeNotifications(
      componentIssues.map((component) => `${component.name}: ${component.label}`)
    );

    return {
      id: config.id,
      name: config.name,
      status: getWorstGitLabStatus(componentIssues, statusbarText),
      description: getPrimaryDescription(
        notifications,
        normalizeDescription(statusbarText, 'All systems operational')
      ),
      notifications: notifications.length > 0 ? notifications : undefined,
      link: config.link,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return createUnknownStatus(config);
  }
}
