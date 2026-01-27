import { randomUUID } from 'node:crypto'
import type { ICustomerModuleService, INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { ACCOUNT_FROM_EMAIL, BACKEND_URL, STORE_CORS } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

type CustomerCreatedEvent = { id: string }

const getStoreBaseUrl = (): string => {
  const storeOrigins =
    STORE_CORS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []
  const storefrontUrl = process.env.STOREFRONT_URL?.trim()
  const nonLocalOrigins = storeOrigins.filter(
    (origin) => !origin.includes('localhost') && !origin.includes('127.0.0.1')
  )
  const firstOrigin = nonLocalOrigins[0] ?? storeOrigins[0]
  const backendUrl = BACKEND_URL
  const fallbackBaseUrl =
    process.env.EMAIL_STOREFRONT_BASE_URL?.trim() ||
    'https://storefront-production-3cb7.up.railway.app'

  const candidate = storefrontUrl || firstOrigin || backendUrl

  try {
    const host = new URL(candidate).host
    const isLocal =
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      host.endsWith('.internal') ||
      host.includes('railway.internal')
    if (isLocal) {
      return fallbackBaseUrl
    }
    return candidate
  } catch {
    return fallbackBaseUrl
  }
}

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<CustomerCreatedEvent>) {
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)
  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )

  const customer = await customerModuleService.retrieveCustomer(data.id)
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>

  if (metadata.email_verified === true) {
    return
  }

  const lastSentAt = metadata.email_verification_last_sent_at
  if (typeof lastSentAt === 'string') {
    const lastSentTime = Date.parse(lastSentAt)
    if (!Number.isNaN(lastSentTime) && Date.now() - lastSentTime < 60_000) {
      return
    }
  }

  const token = randomUUID()
  const storeBaseUrl = getStoreBaseUrl()
  const verificationUrl = new URL('/account/verify-email', storeBaseUrl)
  verificationUrl.searchParams.set('token', token)
  verificationUrl.searchParams.set('email', customer.email)

  await customerModuleService.updateCustomers(customer.id, {
    metadata: {
      ...metadata,
      email_verification_token: token,
      email_verified: false,
      email_verification_token_created_at: new Date().toISOString(),
      email_verification_last_sent_at: new Date().toISOString(),
    },
  })

  try {
    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: 'email',
      from: ACCOUNT_FROM_EMAIL,
      template: EmailTemplates.EMAIL_VERIFICATION,
      data: {
        emailOptions: {
          replyTo: ACCOUNT_FROM_EMAIL,
          subject: 'Verify your Wellness Research Supply email',
        },
        verificationLink: verificationUrl.toString(),
        preview: 'Verify your email address',
      },
    })
  } catch (error) {
    console.error('Error sending verification notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created',
}
