import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';

const INVENTORY_LOCKED_MESSAGE =
  'Inventory levels are managed through variant batches. Update quantities in Batches & Lots.';

export const POST = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.status(403).json({ error: INVENTORY_LOCKED_MESSAGE });
};

export const DELETE = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.status(403).json({ error: INVENTORY_LOCKED_MESSAGE });
};
