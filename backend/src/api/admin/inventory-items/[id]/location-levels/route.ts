import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from '@medusajs/framework/utils';

const INVENTORY_LOCKED_MESSAGE =
  'Inventory levels are managed through variant batches. Update quantities in Batches & Lots.';

export const POST = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.status(403).json({ error: INVENTORY_LOCKED_MESSAGE });
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params as { id: string };
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const query = remoteQueryObjectFromString({
    entryPoint: 'inventory_levels',
    variables: {
      filters: { ...req.filterableFields, inventory_item_id: id },
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  });

  const { rows: inventory_levels, metadata } = await remoteQuery(query);

  return res.status(200).json({
    inventory_levels,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  });
};
