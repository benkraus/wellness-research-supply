import type { INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { ACCOUNT_FROM_EMAIL, BACKEND_URL, STORE_CORS } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

type EmailVerificationEvent = {
  email: string
  token: string
  verificationLink?: string
}

const getStoreBaseUrl = (): string => {
  const storeOrigins = STORE_CORS?.split(',').map((origin) => origin.trim()) ?? []
  const storeBaseUrl = storeOrigins.find(Boolean)
  return storeBaseUrl ?? BACKEND_URL
}

export default async function emailVerificationHandler({
  event: { data },
  container,
}: SubscriberArgs<EmailVerificationEvent>) {
  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )

  const storeBaseUrl = getStoreBaseUrl()

  if (!data.token && !data.verificationLink) {
    console.error('Email verification payload missing token/link', { email: data.email })
    return
  }

  const verificationLink = (() => {
    if (data.verificationLink) {
      try {
        const url = new URL(data.verificationLink)
        if (!url.searchParams.get('email')) {
          url.searchParams.set('email', data.email)
        }
        if (data.token && !url.searchParams.get('token')) {
          url.searchParams.set('token', data.token)
        }
        return url.toString()
      } catch (error) {
        console.error('Invalid verification link payload', error)
      }
    }

    const url = new URL('/account/verify-email', storeBaseUrl)
    if (data.token) {
      url.searchParams.set('token', data.token)
    }
    url.searchParams.set('email', data.email)
    return url.toString()
  })()

  try {
    await notificationModuleService.createNotifications({
      to: data.email,
      channel: 'email',
      from: ACCOUNT_FROM_EMAIL,
      template: EmailTemplates.EMAIL_VERIFICATION,
      data: {
        emailOptions: {
          replyTo: ACCOUNT_FROM_EMAIL,
          subject: 'Verify your Wellness Research Supply email',
        },
        verificationLink,
        preview: 'Verify your email address',
      },
    })
  } catch (error) {
    console.error('Error sending email verification notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'customer.email_verification',
}
