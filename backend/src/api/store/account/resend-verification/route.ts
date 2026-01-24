import { randomUUID } from 'node:crypto'
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import type { ICustomerModuleService, IEventBusModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { BACKEND_URL, STORE_CORS } from '../../../../lib/constants'

type ResendVerificationRequestBody = {
  email: string
  storefrontUrl?: string
}

const getStoreBaseUrl = (storefrontUrl?: string): string => {
  const storeOrigins = STORE_CORS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []
  const firstOrigin = storeOrigins[0]

  if (storefrontUrl) {
    const normalized = storefrontUrl.trim()
    if (storeOrigins.includes(normalized)) {
      return normalized
    }
  }

  return firstOrigin ?? BACKEND_URL
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, storefrontUrl } = req.body as Partial<ResendVerificationRequestBody>

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' })
  }

  const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const eventBus: IEventBusModuleService = req.scope.resolve(Modules.EVENT_BUS)

  const customers = await customerModuleService.listCustomers({ email })
  const customer = customers[0]

  if (!customer) {
    return res.status(200).json({ success: true })
  }

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  if (metadata.email_verified === true) {
    return res.status(200).json({ success: true })
  }

  const lastSentAt = metadata.email_verification_last_sent_at
  if (typeof lastSentAt === 'string') {
    const lastSentTime = Date.parse(lastSentAt)
    if (!Number.isNaN(lastSentTime) && Date.now() - lastSentTime < 60_000) {
      return res.status(200).json({ success: true })
    }
  }

  const token = randomUUID()
  const storeBaseUrl = getStoreBaseUrl(storefrontUrl)
  const verificationUrl = new URL('/account/verify-email', storeBaseUrl)
  verificationUrl.searchParams.set('token', token)
  verificationUrl.searchParams.set('email', email)

  await customerModuleService.updateCustomers(customer.id, {
    metadata: {
      ...metadata,
      email_verification_token: token,
      email_verified: false,
      email_verification_token_created_at: new Date().toISOString(),
      email_verification_last_sent_at: new Date().toISOString(),
    },
  })

  await eventBus.emit([
    {
      name: 'customer.email_verification',
      data: {
        email,
        token,
        verificationLink: verificationUrl.toString(),
      },
    },
  ])

  return res.status(200).json({ success: true })
}
