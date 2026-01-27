import cachified from '@epic-web/cachified';
import { sdk, sdkCache } from '@libs/util/server/client.server';
import { withAuthHeaders } from '../auth.server';
import { MILLIS } from '../cache-builder.server';

import {
  StoreListProductReviewStatsQuery,
  StoreListProductReviewsQuery,
  StoreUpsertProductReviewsDTO,
} from '@lambdacurry/medusa-plugins-sdk';

import { MemoryFileStorage } from '@mjackson/file-storage/memory';
import { FileUpload } from '@mjackson/form-data-parser';
export const fetchProductReviews = async (
  query: Partial<StoreListProductReviewsQuery> = {},
  cacheOptions: { forceFresh?: boolean } = {},
) => {
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 10;
  return await cachified({
    key: `product-reviews-${JSON.stringify(query)}`,
    cache: sdkCache,
    staleWhileRevalidate: MILLIS.ONE_HOUR,
    ttl: MILLIS.TEN_SECONDS,
    forceFresh: cacheOptions.forceFresh,
    async getFreshValue() {
      try {
        return await sdk.store.productReviews.list({
          ...query,
          offset,
          limit,
        });
      } catch (error: any) {
        const status = error?.status ?? error?.response?.status;
        if (status === 404 || error?.message?.includes('Not Found')) {
          return {
            product_reviews: [],
            count: 0,
            offset,
            limit,
          };
        }

        throw error;
      }
    },
  });
};

export const fetchProductReviewStats = async (
  query: StoreListProductReviewStatsQuery = { offset: 0, limit: 10 },
) => {
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 10;
  return await cachified({
    key: `product-review-stats-${JSON.stringify(query)}`,
    cache: sdkCache,
    staleWhileRevalidate: MILLIS.ONE_HOUR,
    ttl: MILLIS.TEN_SECONDS,
    async getFreshValue() {
      try {
        return await sdk.store.productReviews.listStats({ ...query, offset, limit });
      } catch (error: any) {
        const status = error?.status ?? error?.response?.status;
        if (status === 404 || error?.message?.includes('Not Found')) {
          return {
            product_review_stats: [],
            count: 0,
            offset,
            limit,
          };
        }

        throw error;
      }
    },
  });
};

export const upsertProductReviews = withAuthHeaders(
  async (request, authHeaders, data: StoreUpsertProductReviewsDTO) => {
    return await sdk.store.productReviews.upsert(data, authHeaders);
  },
);

export const memoryStorage = new MemoryFileStorage();

export const reviewsFileUploadHandler = async (fileUpload: FileUpload) => {
  const randomId = Math.random().toString(36).substring(2, 15);
  if (fileUpload.type.startsWith('image/')) {
    const bytes = await fileUpload.bytes();
    const normalizedBytes = new Uint8Array(bytes);

    return new File([normalizedBytes], `${randomId}-${fileUpload.fieldName}`, {
      type: fileUpload.type,
    });
  }
  return null;
};
