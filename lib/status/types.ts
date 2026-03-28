export type ProviderStatus =
  | 'operational'
  | 'degraded'
  | 'outage'
  | 'maintenance'
  | 'unknown';

export type ProviderCategory = 'iaas' | 'saas';

export interface NormalizedStatus {
  id: string;
  name: string;
  status: ProviderStatus;
  description: string;
  link: string;
  lastUpdated: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  link: string;
  category: ProviderCategory;
}

export interface ProviderCategoryDefinition {
  id: ProviderCategory;
  label: string;
  description: string;
}
