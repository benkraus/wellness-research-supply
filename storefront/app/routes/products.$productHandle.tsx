import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { redirect, useLoaderData } from 'react-router';
import { ProductReviewSection } from '@app/components/reviews/ProductReviewSection';
import ProductList from '@app/components/sections/ProductList';
import { ProductTemplate } from '@app/templates/ProductTemplate';
import { getMergedProductMeta } from '@libs/util/products';
import { fetchProductReviews, fetchProductReviewStats } from '@libs/util/server/data/product-reviews.server';
import { fetchProducts } from '@libs/util/server/products.server';
import { getMedusaBaseUrl, getPublishableKey } from '@libs/util/server/client.server';
import { withPaginationParams } from '@libs/util/withPaginationParams';

export const loader = async (args: LoaderFunctionArgs) => {
  const { limit: reviewsLimit, offset: reviewsOffset } = withPaginationParams({
    request: args.request,
    defaultPageSize: 5,
  });

  const { products } = await fetchProducts(args.request, {
    handle: args.params.productHandle,
    fields:
      '*categories,*variants,*variants.calculated_price,+variants.inventory_quantity',
  });

  if (!products.length) throw redirect('/404');

  const product = products[0];

  const variants = product.variants ?? [];
  const variantIds = variants.map((variant) => variant?.id).filter(Boolean) as string[];
  const hasBatchInventory = variants.some(
    (variant) => ((variant as { batch_inventory?: unknown[] }).batch_inventory?.length ?? 0) > 0,
  );

  if (!hasBatchInventory && variantIds.length) {
    const publishableKey = await getPublishableKey();
    const baseUrl = getMedusaBaseUrl();
    const url = new URL('/store/variant-batches', baseUrl);
    url.searchParams.set('variant_ids', variantIds.join(','));

    const response = await fetch(url.toString(), {
      headers: {
        ...(publishableKey ? { 'x-publishable-api-key': publishableKey } : {}),
        accept: 'application/json',
      },
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        variant_batches?: Array<{ variant_id: string; batches: unknown[] }>;
      };
      const entries = payload.variant_batches ?? [];
      const batchesByVariant = new Map(entries.map((entry) => [entry.variant_id, entry.batches]));

      variants.forEach((variant) => {
        const variantId = variant?.id;
        if (!variantId) return;
        const batches = batchesByVariant.get(variantId) ?? [];
        if (!batches.length) return;

        (variant as { batch_inventory?: unknown[] }).batch_inventory = batches;
      });
    }
  }

  const [productReviews, productReviewStats] = await Promise.all([
    fetchProductReviews({
      product_id: product.id,
      fields:
        'id,rating,content,name,images.url,created_at,updated_at,response.content,response.created_at,response.id',
      order: 'created_at',
      status: ['approved'],
      // can use status: (pending, approved, flagged)[] to get reviews by status // default is approved
      offset: reviewsOffset,
      limit: reviewsLimit,
    }),
    fetchProductReviewStats({
      product_id: product.id,
      offset: 0,
      limit: 1,
    }),
  ]);

  return { product, productReviews, productReviewStats };
};

export type ProductPageLoaderData = typeof loader;

export const meta: MetaFunction<ProductPageLoaderData> = getMergedProductMeta;

export default function ProductDetailRoute() {
  const { product, productReviews, productReviewStats } = useLoaderData<ProductPageLoaderData>();

  return (
    <>
      <ProductTemplate
        product={product}
        reviewsCount={productReviews.count}
        reviewStats={productReviewStats.product_review_stats[0]}
      />
      <ProductList className="!pb-[100px] xl:px-9" heading="You may also like" />
      <ProductReviewSection />
    </>
  );
}
