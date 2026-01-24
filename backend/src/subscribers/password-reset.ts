import type { ICustomerModuleService, INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { ACCOUNT_FROM_EMAIL, BACKEND_URL, STORE_CORS } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

type PasswordResetEvent = {
  entity_id: string
  actor_type: string
  token: string
  metadata?: Record<string, unknown>
}

const getStoreBaseUrl = (): string => {
  const storeOrigins = STORE_CORS?.split(',').map((origin) => origin.trim()) ?? []
  const storeBaseUrl = storeOrigins.find(Boolean)
  return storeBaseUrl ?? BACKEND_URL
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  if (data.actor_type !== 'customer') {
    return
  }

  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)

  const storeBaseUrl = getStoreBaseUrl()

  let email = data.entity_id
  if (!email.includes('@')) {
    const customer = await customerModuleService.retrieveCustomer(data.entity_id)
    email = customer.email
  }

  const resetLink = `${storeBaseUrl}/account/reset-password?token=${data.token}&email=${encodeURIComponent(email)}`

  try {
    await notificationModuleService.createNotifications({
      to: email,
      channel: 'email',
      from: ACCOUNT_FROM_EMAIL,
      template: EmailTemplates.RESET_PASSWORD,
      data: {
        emailOptions: {
          replyTo: ACCOUNT_FROM_EMAIL,
          subject: 'Reset your Wellness Research Supply password',
        },
        resetLink,
        preview: 'Reset your Wellness Research Supply password',
      },
    })
  } catch (error) {
    console.error('Error sending password reset notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'auth.password_reset',
}
