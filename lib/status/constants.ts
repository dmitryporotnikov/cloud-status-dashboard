import { ProviderCategory, ProviderCategoryDefinition, ProviderConfig } from './types';

export const PROVIDER_CATEGORIES: ProviderCategoryDefinition[] = [
  {
    id: 'iaas',
    label: 'IAAS',
    description: 'Infrastructure and platform providers',
  },
  {
    id: 'saas',
    label: 'SAAS',
    description: 'Developer, collaboration, and business software services',
  },
];

export const PROVIDERS: ProviderConfig[] = [
  { id: 'aws', name: 'Amazon Web Services', link: 'https://status.aws.amazon.com/', category: 'iaas' },
  { id: 'azure', name: 'Microsoft Azure', link: 'https://azure.status.microsoft/en-us/status', category: 'iaas' },
  { id: 'gcp', name: 'Google Cloud Platform', link: 'https://status.cloud.google.com/', category: 'iaas' },
  { id: 'ibm', name: 'IBM Cloud', link: 'https://cloud.ibm.com/status', category: 'iaas' },
  { id: 'oracle', name: 'Oracle Cloud', link: 'https://ocistatus.oraclecloud.com/', category: 'iaas' },
  { id: 'alibaba', name: 'Alibaba Cloud', link: 'https://status.alibabacloud.com/', category: 'iaas' },
  { id: 'digitalocean', name: 'DigitalOcean', link: 'https://status.digitalocean.com/', category: 'iaas' },
  { id: 'cloudflare', name: 'Cloudflare', link: 'https://www.cloudflarestatus.com/', category: 'iaas' },
  { id: 'ovh', name: 'OVHcloud', link: 'https://public-cloud.status-ovhcloud.com/', category: 'iaas' },
  { id: 'vultr', name: 'Vultr', link: 'https://status.vultr.com/', category: 'iaas' },
  { id: 'linode', name: 'Linode', link: 'https://status.linode.com/', category: 'iaas' },
  { id: 'akamai', name: 'Akamai', link: 'https://www.akamaistatus.com/', category: 'iaas' },
  { id: 'vercel', name: 'Vercel', link: 'https://www.vercel-status.com/', category: 'iaas' },
  { id: 'heroku', name: 'Heroku', link: 'https://status.heroku.com/', category: 'iaas' },
  { id: 'mongodb', name: 'MongoDB Cloud', link: 'https://status.mongodb.com/', category: 'iaas' },
  { id: 'github', name: 'GitHub', link: 'https://www.githubstatus.com/', category: 'saas' },
  { id: 'gitlab', name: 'GitLab', link: 'https://status.gitlab.com/', category: 'saas' },
  { id: 'atlassian', name: 'Atlassian', link: 'https://status.atlassian.com/', category: 'saas' },
  { id: 'datadog', name: 'Datadog', link: 'https://status.datadoghq.com/', category: 'saas' },
  { id: 'twilio', name: 'Twilio', link: 'https://status.twilio.com/', category: 'saas' },
  { id: 'slack', name: 'Slack', link: 'https://slack-status.com/', category: 'saas' },
  { id: 'splunk', name: 'Splunk Cloud Platform', link: 'https://status.splunkcloud.com/', category: 'saas' },
  { id: 'salesforce', name: 'Salesforce', link: 'https://status.salesforce.com/', category: 'saas' },
  { id: 'claude', name: 'Claude', link: 'https://status.claude.com/', category: 'saas' },
  {
    id: 'gemini',
    name: 'Gemini',
    link: 'https://status.cloud.google.com/products/Z0FZJAMvEB4j3NbCJs6B/history',
    category: 'saas',
  },
  { id: 'openai', name: 'OpenAI', link: 'https://status.openai.com/', category: 'saas' },
];

export const CACHE_REVALIDATE_SECONDS = 300;
export const PROVIDER_TIMEOUT_MS = 7000;
export const CLIENT_REFRESH_MS = 300000;
export const PROVIDER_COUNT = PROVIDERS.length;

const PROVIDER_CONFIG_BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

export function getProvidersByCategory(category: ProviderCategory): ProviderConfig[] {
  return PROVIDERS.filter((provider) => provider.category === category);
}

export function getProviderConfig(id: string): ProviderConfig {
  const provider = PROVIDER_CONFIG_BY_ID.get(id);

  if (!provider) {
    throw new Error(`Unknown provider: ${id}`);
  }

  return provider;
}
