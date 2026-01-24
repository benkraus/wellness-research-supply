import type { ICustomerModuleService, INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { ACCOUNT_FROM_EMAIL, BACKEND_URL, STORE_CORS } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

const getStoreBaseUrl = (): string => {
  const storeOrigins = STORE_CORS?.split(',').map((origin) => origin.trim()) ?? []
  const storeBaseUrl = storeOrigins.find(Boolean)
  return storeBaseUrl ?? BACKEND_URL
}

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)

  const customer = await customerModuleService.retrieveCustomer(data.id)
  const firstName = customer.first_name || 'Researcher'
  const storeBaseUrl = getStoreBaseUrl()

  try {
    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: 'email',
      from: ACCOUNT_FROM_EMAIL,
      template: EmailTemplates.WELCOME,
      data: {
        emailOptions: {
          replyTo: ACCOUNT_FROM_EMAIL,
          subject: 'Welcome to Wellness Research Supply',
        },
        firstName,
        actionUrl: `${storeBaseUrl}/account`,
        preview: 'Welcome to Wellness Research Supply',
      },
    })
  } catch (error) {
    console.error('Error sending welcome notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created',
}
