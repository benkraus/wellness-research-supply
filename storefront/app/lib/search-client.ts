import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';

const getEnv = () => {
  if (typeof window !== 'undefined') {
    return (window as typeof window & { ENV?: Record<string, string | undefined> }).ENV || {};
  }

  return {
    PUBLIC_SEARCH_ENDPOINT: process.env.PUBLIC_SEARCH_ENDPOINT,
    PUBLIC_SEARCH_API_KEY: process.env.PUBLIC_SEARCH_API_KEY,
    SEARCH_INDEX_NAME: process.env.SEARCH_INDEX_NAME,
  } as Record<string, string | undefined>;
};

const env = getEnv();

export const SEARCH_INDEX_NAME = env.SEARCH_INDEX_NAME || 'products';

const endpoint = env.PUBLIC_SEARCH_ENDPOINT || 'http://127.0.0.1:7700';
const apiKey = env.PUBLIC_SEARCH_API_KEY || 'test_key';

let cachedSearchClient: ReturnType<typeof instantMeiliSearch> | null = null;

export const getSearchClient = () => {
  if (!cachedSearchClient) {
    cachedSearchClient = instantMeiliSearch(endpoint, apiKey);
  }

  return cachedSearchClient.searchClient;
};
