import { useRootLoaderData } from './useRootLoaderData';
import type { SiteDetailsRootData } from '@libs/types';

export const useSiteDetails = (): SiteDetailsRootData | undefined => {
  const data = useRootLoaderData();

  return data?.siteDetails;
};
