import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.status(200).json({ status: 'ok' })
}
