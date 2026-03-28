import { NormalizedStatus } from './types';
import { fetchAWSStatus } from './providers/aws';
import { fetchAzureStatus } from './providers/azure';
import { fetchGCPStatus } from './providers/gcp';
import { fetchIBMStatus } from './providers/ibm';
import { fetchOracleStatus } from './providers/oracle';
import { fetchAlibabaStatus } from './providers/alibaba';
import { fetchDigitalOceanStatus } from './providers/digitalocean';
import { fetchCloudflareStatus } from './providers/cloudflare';
import { fetchOVHStatus } from './providers/ovh';
import { fetchVultrStatus } from './providers/vultr';
import { fetchLinodeStatus } from './providers/linode';
import { fetchAkamaiStatus } from './providers/akamai';
import { fetchVercelStatus } from './providers/vercel';
import { fetchHerokuStatus } from './providers/heroku';
import { fetchMongoDBStatus } from './providers/mongodb';
import { fetchGitHubStatus } from './providers/github';
import { fetchGitLabStatus } from './providers/gitlab';
import { fetchAtlassianStatus } from './providers/atlassian';
import { fetchDatadogStatus } from './providers/datadog';
import { fetchTwilioStatus } from './providers/twilio';
import { fetchSlackStatus } from './providers/slack';
import { fetchSplunkStatus } from './providers/splunk';
import { fetchSalesforceStatus } from './providers/salesforce';
import { fetchClaudeStatus } from './providers/claude';
import { fetchGeminiStatus } from './providers/gemini';
import { fetchOpenAIStatus } from './providers/openai';
import { getProviderConfig, getProvidersByCategory } from './constants';
import { createUnknownStatus } from './normalize';
import { ProviderCategory } from './types';

export { fetchAWSStatus } from './providers/aws';
export { fetchAzureStatus } from './providers/azure';
export { fetchGCPStatus } from './providers/gcp';
export { fetchIBMStatus } from './providers/ibm';
export { fetchOracleStatus } from './providers/oracle';
export { fetchAlibabaStatus } from './providers/alibaba';
export { fetchDigitalOceanStatus } from './providers/digitalocean';
export { fetchCloudflareStatus } from './providers/cloudflare';
export { fetchOVHStatus } from './providers/ovh';
export { fetchVultrStatus } from './providers/vultr';
export { fetchLinodeStatus } from './providers/linode';
export { fetchAkamaiStatus } from './providers/akamai';
export { fetchVercelStatus } from './providers/vercel';
export { fetchHerokuStatus } from './providers/heroku';
export { fetchMongoDBStatus } from './providers/mongodb';
export { fetchGitHubStatus } from './providers/github';
export { fetchGitLabStatus } from './providers/gitlab';
export { fetchAtlassianStatus } from './providers/atlassian';
export { fetchDatadogStatus } from './providers/datadog';
export { fetchTwilioStatus } from './providers/twilio';
export { fetchSlackStatus } from './providers/slack';
export { fetchSplunkStatus } from './providers/splunk';
export { fetchSalesforceStatus } from './providers/salesforce';
export { fetchClaudeStatus } from './providers/claude';
export { fetchGeminiStatus } from './providers/gemini';
export { fetchOpenAIStatus } from './providers/openai';
export { CACHE_REVALIDATE_SECONDS } from './constants';

const PROVIDER_FETCHERS = [
  { config: getProviderConfig('aws'), fetcher: fetchAWSStatus },
  { config: getProviderConfig('azure'), fetcher: fetchAzureStatus },
  { config: getProviderConfig('gcp'), fetcher: fetchGCPStatus },
  { config: getProviderConfig('ibm'), fetcher: fetchIBMStatus },
  { config: getProviderConfig('oracle'), fetcher: fetchOracleStatus },
  { config: getProviderConfig('alibaba'), fetcher: fetchAlibabaStatus },
  { config: getProviderConfig('digitalocean'), fetcher: fetchDigitalOceanStatus },
  { config: getProviderConfig('cloudflare'), fetcher: fetchCloudflareStatus },
  { config: getProviderConfig('ovh'), fetcher: fetchOVHStatus },
  { config: getProviderConfig('vultr'), fetcher: fetchVultrStatus },
  { config: getProviderConfig('linode'), fetcher: fetchLinodeStatus },
  { config: getProviderConfig('akamai'), fetcher: fetchAkamaiStatus },
  { config: getProviderConfig('vercel'), fetcher: fetchVercelStatus },
  { config: getProviderConfig('heroku'), fetcher: fetchHerokuStatus },
  { config: getProviderConfig('mongodb'), fetcher: fetchMongoDBStatus },
  { config: getProviderConfig('github'), fetcher: fetchGitHubStatus },
  { config: getProviderConfig('gitlab'), fetcher: fetchGitLabStatus },
  { config: getProviderConfig('atlassian'), fetcher: fetchAtlassianStatus },
  { config: getProviderConfig('datadog'), fetcher: fetchDatadogStatus },
  { config: getProviderConfig('twilio'), fetcher: fetchTwilioStatus },
  { config: getProviderConfig('slack'), fetcher: fetchSlackStatus },
  { config: getProviderConfig('splunk'), fetcher: fetchSplunkStatus },
  { config: getProviderConfig('salesforce'), fetcher: fetchSalesforceStatus },
  { config: getProviderConfig('claude'), fetcher: fetchClaudeStatus },
  { config: getProviderConfig('gemini'), fetcher: fetchGeminiStatus },
  { config: getProviderConfig('openai'), fetcher: fetchOpenAIStatus },
] as const;

export async function fetchProviderStatuses(
  providerIds?: string[]
): Promise<NormalizedStatus[]> {
  const providerIdSet = providerIds ? new Set(providerIds) : null;
  const filteredFetchers = providerIdSet
    ? PROVIDER_FETCHERS.filter(({ config }) => providerIdSet.has(config.id))
    : PROVIDER_FETCHERS;
  const results = await Promise.allSettled(filteredFetchers.map(({ fetcher }) => fetcher()));

  return results.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : createUnknownStatus(filteredFetchers[index].config)
  );
}

export async function fetchProviderStatusesByCategory(
  category: ProviderCategory
): Promise<NormalizedStatus[]> {
  return fetchProviderStatuses(getProvidersByCategory(category).map((provider) => provider.id));
}

export async function fetchAllProviderStatuses(): Promise<NormalizedStatus[]> {
  return fetchProviderStatuses();
}
