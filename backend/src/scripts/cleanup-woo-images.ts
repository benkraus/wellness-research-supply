import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import type { IProductModuleService } from "@medusajs/types";
import { Client } from "minio";

type MinioConfig = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseMinioConfig(): MinioConfig {
  const rawEndpoint = requireEnv("MINIO_ENDPOINT");
  const accessKey = requireEnv("MINIO_ACCESS_KEY");
  const secretKey = requireEnv("MINIO_SECRET_KEY");
  const bucket = process.env.MINIO_BUCKET || "medusa-media";

  let endPoint = rawEndpoint;
  let useSSL = true;
  let port = 443;

  if (endPoint.startsWith("https://")) {
    endPoint = endPoint.replace("https://", "");
    useSSL = true;
    port = 443;
  } else if (endPoint.startsWith("http://")) {
    endPoint = endPoint.replace("http://", "");
    useSSL = false;
    port = 80;
  }

  endPoint = endPoint.replace(/\/$/, "");
  const portMatch = endPoint.match(/:(\d+)$/);
  if (portMatch) {
    port = parseInt(portMatch[1], 10);
    endPoint = endPoint.replace(/:(\d+)$/, "");
  }

  return {
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    bucket,
  };
}

function listAllObjects(client: Client, bucket: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const keys: string[] = [];
    const stream = client.listObjectsV2(bucket, "", true);
    stream.on("data", (obj) => {
      if (obj?.name) keys.push(obj.name);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(keys));
  });
}

function extractKeyFromUrl(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/+/, "");
    if (!path) return null;
    const parts = path.split("/");
    if (parts[0] !== bucket) return null;
    const key = parts.slice(1).join("/");
    return key || null;
  } catch {
    return null;
  }
}

function getOriginalFilename(meta?: Record<string, string>): string | undefined {
  if (!meta) return undefined;
  return (
    meta["x-amz-meta-original-filename"] ||
    meta["X-Amz-Meta-Original-Filename"] ||
    meta["original-filename"] ||
    meta["Original-Filename"]
  );
}

async function listAllProducts(productModuleService: IProductModuleService) {
  const all = [] as any[];
  const take = 100;
  let skip = 0;
  while (true) {
    const batch = await productModuleService.listProducts(
      {},
      { take, skip, relations: ["images"] }
    );
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < take) break;
    skip += batch.length;
  }
  return all;
}

export default async function cleanupWooImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve<IProductModuleService>(Modules.PRODUCT);

  const confirm = process.env.WC_CLEANUP_CONFIRM === "true";
  const config = parseMinioConfig();
  const client = new Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  logger.info("Collecting products imported from WooCommerce...");
  const products = await listAllProducts(productModuleService);
  const wooProducts = products.filter((product) => product?.metadata?.woo_product_id);

  const allReferencedUrls = new Set<string>();
  for (const product of products) {
    if (product.thumbnail) allReferencedUrls.add(product.thumbnail);
    for (const image of product.images || []) {
      if (image?.url) allReferencedUrls.add(image.url);
    }
  }

  const referencedKeysAll = new Set<string>();
  for (const url of allReferencedUrls) {
    const key = extractKeyFromUrl(url, config.bucket);
    if (key) referencedKeysAll.add(key);
  }

  const wooReferencedUrls = new Set<string>();
  for (const product of wooProducts) {
    if (product.thumbnail) wooReferencedUrls.add(product.thumbnail);
    for (const image of product.images || []) {
      if (image?.url) wooReferencedUrls.add(image.url);
    }
  }

  const wooReferencedKeys = new Set<string>();
  for (const url of wooReferencedUrls) {
    const key = extractKeyFromUrl(url, config.bucket);
    if (key) wooReferencedKeys.add(key);
  }

  logger.info(`Found ${wooReferencedKeys.size} referenced Woo image objects.`);
  if (!wooReferencedKeys.size) {
    logger.warn("No referenced Woo images found. Aborting cleanup.");
    return;
  }

  const referencedOriginalNames = new Set<string>();
  for (const key of wooReferencedKeys) {
    try {
      const stat = await client.statObject(config.bucket, key);
      const original = getOriginalFilename(stat.metaData as Record<string, string> | undefined);
      if (original) referencedOriginalNames.add(original);
    } catch (error) {
      logger.warn(`Failed to stat referenced object ${key}: ${(error as Error).message}`);
    }
  }

  const bucketKeys = await listAllObjects(client, config.bucket);
  const keysToDelete: string[] = [];

  for (const key of bucketKeys) {
    if (referencedKeysAll.has(key)) continue;
    try {
      const stat = await client.statObject(config.bucket, key);
      const original = getOriginalFilename(stat.metaData as Record<string, string> | undefined);
      if (original && referencedOriginalNames.has(original)) {
        keysToDelete.push(key);
      }
    } catch (error) {
      logger.warn(`Failed to stat object ${key}: ${(error as Error).message}`);
    }
  }

  if (!keysToDelete.length) {
    logger.info("No duplicate Woo image objects found.");
    return;
  }

  if (!confirm) {
    logger.warn(
      `Dry run: would delete ${keysToDelete.length} duplicate images. Set WC_CLEANUP_CONFIRM=true to apply.`
    );
    logger.info(keysToDelete.slice(0, 10).map((key) => `- ${key}`).join("\n"));
    return;
  }

  logger.info(`Deleting ${keysToDelete.length} duplicate images from MinIO...`);
  await client.removeObjects(config.bucket, keysToDelete);
  logger.info("Duplicate image cleanup finished.");
}
