import type { INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { ACCOUNT_FROM_EMAIL, BACKEND_URL, STORE_CORS } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

type PasswordChangedEvent = {
  email: string
  contactUrl?: string
}

const getStoreBaseUrl = (): string => {
  const storeOrigins = STORE_CORS?.split(',').map((origin) => origin.trim()) ?? []
  const storeBaseUrl = storeOrigins.find(Boolean)
  return storeBaseUrl ?? BACKEND_URL
}

export default async function passwordChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordChangedEvent>) {
  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )

  const storeBaseUrl = getStoreBaseUrl()
  const contactUrl = data.contactUrl ?? `${storeBaseUrl}/support`

  try {
    await notificationModuleService.createNotifications({
      to: data.email,
      channel: 'email',
      from: ACCOUNT_FROM_EMAIL,
      template: EmailTemplates.PASSWORD_CHANGED,
      data: {
        emailOptions: {
          replyTo: ACCOUNT_FROM_EMAIL,
          subject: 'Your Wellness Research Supply password was changed',
        },
        contactUrl,
        preview: 'Your password has been changed',
      },
    })
  } catch (error) {
    console.error('Error sending password changed notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'customer.password_changed',
}
