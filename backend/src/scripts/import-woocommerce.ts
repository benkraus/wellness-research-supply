import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
} from "@medusajs/medusa/core-flows";
import type {
  IFileModuleService,
  IFulfillmentModuleService,
  IProductModuleService,
  ISalesChannelModuleService,
} from "@medusajs/types";
import path from "node:path";

type WooProduct = {
  id: number;
  name: string;
  slug?: string;
  type: "simple" | "variable" | "grouped" | "external" | string;
  status?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  images?: { id: number; src: string; alt?: string }[];
  attributes?: {
    id: number;
    name: string;
    variation: boolean;
    options: string[];
  }[];
  categories?: { id: number; name: string; slug?: string }[];
};

type WooVariation = {
  id: number;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  image?: { id: number; src: string; alt?: string } | null;
  attributes?: { id: number; name: string; option: string }[];
};

const DEFAULT_OPTION_TITLE = "Default";
const DEFAULT_OPTION_VALUE = "Default";

const IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

type WooAuth =
  | { mode: "consumer"; key: string; secret: string }
  | { mode: "app"; username: string; password: string };

function getWooAuth(): WooAuth {
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;
  if (key && secret) {
    return { mode: "consumer", key, secret };
  }

  const username = process.env.WC_USERNAME;
  const password = process.env.WC_APP_PASSWORD;
  if (username && password) {
    return { mode: "app", username, password };
  }

  throw new Error(
    "Missing WooCommerce auth. Set WC_CONSUMER_KEY/WC_CONSUMER_SECRET or WC_USERNAME/WC_APP_PASSWORD."
  );
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(input?: string): string | undefined {
  if (!input) return undefined;
  const stripped = input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length ? stripped : undefined;
}

function parsePriceToMinorUnits(price?: string): number | null {
  if (!price) return null;
  const parsed = Number(price);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

function buildWooApiUrl(
  baseUrl: string,
  pathFragment: string,
  params?: Record<string, string | number>
) {
  const base = normalizeBaseUrl(baseUrl);
  const apiBase = `${base.replace(/\/$/, "")}/wp-json/wc/v3/`;
  const url = new URL(pathFragment.replace(/^\//, ""), apiBase);

  const auth = getWooAuth();
  if (auth.mode === "consumer") {
    url.searchParams.set("consumer_key", auth.key);
    url.searchParams.set("consumer_secret", auth.secret);
  }

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

class WooCommerceRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`WooCommerce request failed (${status}): ${body}`);
    this.status = status;
    this.body = body;
  }
}

function getWooTotalPages(headers: Headers): number | undefined {
  const total = headers.get("x-wp-totalpages");
  if (!total) return undefined;
  const parsed = Number(total);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function isWooInvalidPageError(error: unknown): boolean {
  if (!(error instanceof WooCommerceRequestError)) return false;
  if (error.status !== 400) return false;
  try {
    const parsed = JSON.parse(error.body) as { code?: string; message?: string };
    if (parsed.code === "rest_post_invalid_page_number") return true;
    if (parsed.message?.toLowerCase().includes("page number")) return true;
  } catch {
    // ignore
  }
  return error.body.toLowerCase().includes("page number");
}

async function wcFetchJsonWithMeta<T>(
  baseUrl: string,
  pathFragment: string,
  params?: Record<string, string | number>
) {
  const url = buildWooApiUrl(baseUrl, pathFragment, params);
  const auth = getWooAuth();
  const headers: Record<string, string> = {};
  if (auth.mode === "app") {
    const token = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new WooCommerceRequestError(response.status, body);
  }
  const data = (await response.json()) as T;
  return {
    data,
    totalPages: getWooTotalPages(response.headers),
  };
}

async function wcFetchAllPages<T>(
  baseUrl: string,
  pathFragment: string,
  params: Record<string, string | number>
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages: number | undefined;

  while (true) {
    let pageData: T[];
    try {
      const response = await wcFetchJsonWithMeta<T[]>(baseUrl, pathFragment, {
        ...params,
        page,
      });
      pageData = response.data;
      if (totalPages === undefined && response.totalPages) {
        totalPages = response.totalPages;
      }
    } catch (error) {
      if (isWooInvalidPageError(error)) break;
      throw error;
    }

    if (!pageData.length) break;
    items.push(...pageData);
    if (totalPages && page >= totalPages) break;
    page += 1;
  }

  return items;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await handler(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

function getFilenameFromUrl(url: string, mimeType?: string): string {
  try {
    const parsed = new URL(url);
    const base = path.basename(parsed.pathname);
    if (base.includes(".")) return base;
  } catch {
    // ignore
  }

  const ext = mimeType ? IMAGE_MIME_EXT[mimeType.split(";")[0].trim()] : undefined;
  return `image-${Date.now()}${ext ?? ""}`;
}

async function uploadImageFromUrl(
  fileModuleService: IFileModuleService,
  imageUrl: string
): Promise<string | null> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = getFilenameFromUrl(imageUrl, contentType);

  const file = await fileModuleService.createFiles({
    filename,
    mimeType: contentType.split(";")[0].trim(),
    content: buffer.toString("base64"),
    access: "public",
  });

  return file.url;
}

function collectOptionValues(
  product: WooProduct,
  variations: WooVariation[]
): Map<string, Set<string>> {
  const optionMap = new Map<string, Set<string>>();

  product.attributes
    ?.filter((attr) => attr.variation)
    .forEach((attr) => {
      const entry = optionMap.get(attr.name) ?? new Set<string>();
      for (const value of attr.options || []) {
        if (value) entry.add(value);
      }
      optionMap.set(attr.name, entry);
    });

  for (const variation of variations) {
    for (const attr of variation.attributes || []) {
      if (!attr.name) continue;
      const entry = optionMap.get(attr.name) ?? new Set<string>();
      if (attr.option) entry.add(attr.option);
      optionMap.set(attr.name, entry);
    }
  }

  return optionMap;
}

function buildVariantOptions(
  optionTitles: string[],
  variation?: WooVariation
): Record<string, string> {
  if (!optionTitles.length) {
    return { [DEFAULT_OPTION_TITLE]: DEFAULT_OPTION_VALUE };
  }

  const output: Record<string, string> = {};
  for (const title of optionTitles) {
    const match = variation?.attributes?.find((attr) => attr.name === title);
    output[title] = match?.option || DEFAULT_OPTION_VALUE;
  }
  return output;
}

async function ensureDefaultSalesChannel(
  salesChannelModuleService: ISalesChannelModuleService,
  container: ExecArgs["container"]
): Promise<string> {
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    });
    defaultSalesChannel = result;
  }

  return defaultSalesChannel[0].id;
}

async function ensureDefaultShippingProfile(
  fulfillmentModuleService: IFulfillmentModuleService,
  container: ExecArgs["container"]
): Promise<string> {
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({});
  if (shippingProfiles.length) {
    return shippingProfiles[0].id;
  }

  const { result } = await createShippingProfilesWorkflow(container).run({
    input: {
      shipping_profiles: [
        {
          name: "Default Shipping Profile",
          type: "default",
        },
      ],
    },
  });

  return result[0].id;
}

export default async function importWooCommerceProducts({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fileModuleService = container.resolve<IFileModuleService>(Modules.FILE);
  const productModuleService = container.resolve<IProductModuleService>(Modules.PRODUCT);
  const fulfillmentModuleService = container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL);

  const baseUrl = requireEnv("WC_BASE_URL");
  const currency = (process.env.WC_CURRENCY || "usd").toLowerCase();
  const perPage = Number(process.env.WC_PER_PAGE || 100);
  const includeDrafts = process.env.WC_INCLUDE_DRAFTS === "true";
  const batchSize = Number(process.env.WC_BATCH_SIZE || 20);
  const imageConcurrency = Number(process.env.WC_IMAGE_CONCURRENCY || 4);

  logger.info("Fetching WooCommerce products...");
  const status = includeDrafts ? "any" : "publish";
  const products = await wcFetchAllPages<WooProduct>(baseUrl, "products", {
    per_page: perPage,
    status,
  });

  if (!products.length) {
    logger.warn("No WooCommerce products found.");
    return;
  }

  logger.info(`Fetched ${products.length} products from WooCommerce.`);

  const defaultSalesChannelId = await ensureDefaultSalesChannel(
    salesChannelModuleService,
    container
  );
  const shippingProfileId = await ensureDefaultShippingProfile(
    fulfillmentModuleService,
    container
  );

  const categoryHandles = new Map<string, { name: string; handle: string }>();
  for (const product of products) {
    for (const category of product.categories || []) {
      const handle = category.slug ? slugify(category.slug) : slugify(category.name);
      if (!categoryHandles.has(handle)) {
        categoryHandles.set(handle, { name: category.name, handle });
      }
    }
  }

  const existingCategories = categoryHandles.size
    ? await productModuleService.listProductCategories(
        { handle: Array.from(categoryHandles.keys()) },
        { take: categoryHandles.size }
      )
    : [];
  const existingCategoryByHandle = new Map(
    existingCategories.map((category) => [category.handle, category.id])
  );

  const categoriesToCreate = Array.from(categoryHandles.values()).filter(
    (category) => !existingCategoryByHandle.has(category.handle)
  );

  if (categoriesToCreate.length) {
    for (const category of categoriesToCreate) {
      try {
        const created = await productModuleService.createProductCategories({
          name: category.name,
          handle: category.handle,
          is_active: true,
        });
        existingCategoryByHandle.set(created.handle, created.id);
      } catch (error) {
        const message = (error as Error)?.message || "";
        if (message.includes("already exists")) {
          const existing = await productModuleService.listProductCategories({
            handle: category.handle,
          });
          if (existing.length) {
            existingCategoryByHandle.set(existing[0].handle, existing[0].id);
            continue;
          }
        }
        throw error;
      }
    }
  }

  const productHandles = products
    .map((product) => product.slug || slugify(product.name))
    .filter(Boolean) as string[];

  const existingProducts = productHandles.length
    ? await productModuleService.listProducts(
        { handle: productHandles },
        { take: productHandles.length }
      )
    : [];

  const existingProductHandles = new Set(
    existingProducts.map((product) => product.handle)
  );

  const productsToCreate: any[] = [];

  for (const product of products) {
    const handle = product.slug || slugify(product.name);
    if (!handle) {
      logger.warn(`Skipping product without handle: ${product.name}`);
      continue;
    }
    if (existingProductHandles.has(handle)) {
      logger.info(`Skipping existing product: ${handle}`);
      continue;
    }

    if (product.type !== "simple" && product.type !== "variable") {
      logger.warn(`Skipping unsupported product type ${product.type}: ${product.name}`);
      continue;
    }

    const variations = product.type === "variable"
      ? await wcFetchAllPages<WooVariation>(
          baseUrl,
          `products/${product.id}/variations`,
          { per_page: perPage }
        )
      : [];

    const optionMap = collectOptionValues(product, variations);
    if (!optionMap.size) {
      optionMap.set(DEFAULT_OPTION_TITLE, new Set([DEFAULT_OPTION_VALUE]));
    }

    const optionTitles = Array.from(optionMap.keys());
    const options = optionTitles.map((title) => ({
      title,
      values: Array.from(optionMap.get(title) || []),
    }));

    const variants = (product.type === "variable" ? variations : [undefined]).flatMap(
      (variation) => {
        const price = parsePriceToMinorUnits(
          variation?.sale_price ||
            variation?.price ||
            variation?.regular_price ||
            product.sale_price ||
            product.price ||
            product.regular_price
        );

        if (price === null) {
          logger.warn(`Skipping variant without price: ${product.name}`);
          return [];
        }

        const variantOptions = buildVariantOptions(optionTitles, variation);
        for (const [key, value] of Object.entries(variantOptions)) {
          const set = optionMap.get(key);
          if (set && value && !set.has(value)) {
            set.add(value);
          }
        }

        return [
          {
            title: variation?.attributes?.map((attr) => attr.option).filter(Boolean).join(" / ") ||
              product.name,
            sku:
              variation?.sku ||
              product.sku ||
              `woo-${product.id}${variation ? `-${variation.id}` : ""}`,
            options: variantOptions,
            prices: [
              {
                amount: price,
                currency_code: currency,
              },
            ],
            metadata: {
              woo_product_id: product.id,
              woo_variation_id: variation?.id,
            },
          },
        ];
      }
    );

    if (!variants.length) {
      logger.warn(`Skipping product without variants: ${product.name}`);
      continue;
    }

    const imageSources = new Set<string>();
    for (const image of product.images || []) {
      if (image?.src) imageSources.add(image.src);
    }
    for (const variation of variations) {
      if (variation.image?.src) imageSources.add(variation.image.src);
    }

    const uploadedImages = await mapWithConcurrency(
      Array.from(imageSources),
      imageConcurrency,
      async (src) => uploadImageFromUrl(fileModuleService, src)
    );

    const imageUrls = uploadedImages.filter(
      (url): url is string => typeof url === "string" && url.length > 0
    );
    const imageObjects = imageUrls.map((url) => ({ url }));

    const categoryIds = (product.categories || [])
      .map((category) => {
        const handle = category.slug ? slugify(category.slug) : slugify(category.name);
        const id = existingCategoryByHandle.get(handle);
        return id ? { id } : null;
      })
      .filter(Boolean) as { id: string }[];

    productsToCreate.push({
      title: product.name,
      handle,
      description: product.description || undefined,
      subtitle: stripHtml(product.short_description),
      status: product.status === "publish" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
      shipping_profile_id: shippingProfileId,
      sales_channels: [{ id: defaultSalesChannelId }],
      categories: categoryIds.length ? categoryIds : undefined,
      images: imageObjects.length ? imageObjects : undefined,
      thumbnail: imageUrls.length ? imageUrls[0] : undefined,
      options,
      variants,
      metadata: {
        woo_product_id: product.id,
        woo_type: product.type,
      },
    });
  }

  if (!productsToCreate.length) {
    logger.warn("No products to create after filtering.");
    return;
  }

  logger.info(`Creating ${productsToCreate.length} products in Medusa...`);
  for (let i = 0; i < productsToCreate.length; i += batchSize) {
    const batch = productsToCreate.slice(i, i + batchSize);
    await createProductsWorkflow(container).run({
      input: {
        products: batch,
      },
    });
    logger.info(`Created ${Math.min(i + batch.length, productsToCreate.length)} / ${productsToCreate.length}`);
  }

  logger.info("WooCommerce import finished.");
}
