import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import type { ICustomerModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

type VerifyEmailRequestBody = {
  email: string
  token: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, token } = req.body as Partial<VerifyEmailRequestBody>

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' })
  }

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required.' })
  }

  const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const customers = await customerModuleService.listCustomers({ email })
  const customer = customers[0]

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' })
  }

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  const storedToken = metadata.email_verification_token
  const tokenCreatedAt = metadata.email_verification_token_created_at

  if (storedToken !== token) {
    return res.status(400).json({ error: 'Invalid verification token.' })
  }

  if (typeof tokenCreatedAt === 'string') {
    const createdAt = Date.parse(tokenCreatedAt)
    const maxAgeMs = 24 * 60 * 60 * 1000
    if (!Number.isNaN(createdAt) && Date.now() - createdAt > maxAgeMs) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' })
    }
  }

  await customerModuleService.updateCustomers(customer.id, {
    metadata: {
      ...metadata,
      email_verified: true,
      email_verification_token: null,
      email_verification_token_created_at: null,
      email_verification_last_sent_at: null,
    },
  })

  return res.status(200).json({ success: true })
}
