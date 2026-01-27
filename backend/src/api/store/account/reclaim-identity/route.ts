import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import type { IAuthModuleService, ICustomerModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

type ReclaimIdentityRequestBody = {
  email: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email } = req.body as Partial<ReclaimIdentityRequestBody>

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' })
  }

  const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH)

  const existingCustomers = await customerModuleService.listCustomers({ email })
  if (existingCustomers.length) {
    return res.status(409).json({ error: 'Customer already exists.' })
  }

  const authIdentityProvider = (authModuleService as any).getAuthIdentityProviderService?.('emailpass')

  if (!authIdentityProvider) {
    return res.status(500).json({ error: 'Auth provider unavailable.' })
  }
  let authIdentity

  try {
    authIdentity = await authIdentityProvider.retrieve({ entity_id: email })
  } catch (error) {
    return res.status(200).json({ success: true, reclaimed: false })
  }

  const metadata = (authIdentity.app_metadata ?? {}) as Record<string, unknown>
  const metadataKeys = Object.keys(metadata)
  const allowedKeys = ['customer_id']

  if (metadataKeys.some((key) => !allowedKeys.includes(key))) {
    return res.status(409).json({ error: 'Identity is already in use.' })
  }

  const customerId = metadata.customer_id
  if (typeof customerId === 'string' && customerId.length) {
    try {
      await customerModuleService.retrieveCustomer(customerId)
      return res.status(409).json({ error: 'Identity is already in use.' })
    } catch {
      // Customer is missing, safe to reclaim.
    }
  }

  await authModuleService.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: {},
  })

  return res.status(200).json({ success: true, reclaimed: true })
}
