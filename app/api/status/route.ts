import { NextRequest, NextResponse } from 'next/server';
import { fetchAllProviderStatuses, fetchProviderStatusesByCategory } from '@/lib/status';
import { CACHE_REVALIDATE_SECONDS, PROVIDERS, PROVIDER_CATEGORIES } from '@/lib/status/constants';
import { createUnknownStatus } from '@/lib/status/normalize';
import { ProviderCategory } from '@/lib/status/types';

export const dynamic = 'force-dynamic';

function isProviderCategory(value: string | null): value is ProviderCategory {
  return PROVIDER_CATEGORIES.some((category) => category.id === value);
}

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    const statuses = isProviderCategory(category)
      ? await fetchProviderStatusesByCategory(category)
      : await fetchAllProviderStatuses();

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching provider statuses:', error);

    const category = request.nextUrl.searchParams.get('category');
    const providers = isProviderCategory(category)
      ? PROVIDERS.filter((provider) => provider.category === category)
      : PROVIDERS;

    return NextResponse.json(providers.map((provider) => createUnknownStatus(provider)));
  }
}
