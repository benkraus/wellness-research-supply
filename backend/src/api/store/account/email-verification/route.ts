import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import type { INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { ACCOUNT_FROM_EMAIL, BACKEND_URL, STORE_CORS } from '../../../../lib/constants'
import { EmailTemplates } from '../../../../modules/email-notifications/templates'

type EmailVerificationRequestBody = {
  email: string
  token?: string
  verificationLink?: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, token, verificationLink } = req.body as Partial<EmailVerificationRequestBody>

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' })
  }

  if (token && typeof token !== 'string') {
    return res.status(400).json({ error: 'Token must be a string.' })
  }

  if (verificationLink && typeof verificationLink !== 'string') {
    return res.status(400).json({ error: 'Verification link must be a string.' })
  }

  if (!token && !verificationLink) {
    return res.status(400).json({ error: 'Token or verification link is required.' })
  }

  const notificationModuleService: INotificationModuleService = req.scope.resolve(
    Modules.NOTIFICATION
  )

  const storeOrigins = STORE_CORS?.split(',').map((origin) => origin.trim()) ?? []
  const storeBaseUrl = storeOrigins.find(Boolean) ?? BACKEND_URL

  const finalVerificationLink = (() => {
    if (verificationLink) {
      try {
        const url = new URL(verificationLink, storeBaseUrl)
        if (!url.searchParams.get('email')) {
          url.searchParams.set('email', email)
        }
        if (token && !url.searchParams.get('token')) {
          url.searchParams.set('token', token)
        }
        return url.toString()
      } catch {
        // Fall back to token-based link
      }
    }

    if (!token) {
      return null
    }

    const url = new URL('/account/verify-email', storeBaseUrl)
    url.searchParams.set('token', token)
    url.searchParams.set('email', email)
    return url.toString()
  })()

  if (!finalVerificationLink) {
    return res.status(400).json({ error: 'Unable to build verification link.' })
  }

  try {
    await notificationModuleService.createNotifications({
      to: email,
      channel: 'email',
      from: ACCOUNT_FROM_EMAIL,
      template: EmailTemplates.EMAIL_VERIFICATION,
      data: {
        emailOptions: {
          replyTo: ACCOUNT_FROM_EMAIL,
          subject: 'Verify your Wellness Research Supply email',
        },
        verificationLink: finalVerificationLink,
        preview: 'Verify your email address',
      },
    })
  } catch (error) {
    console.error('Error sending email verification notification:', error)
    return res.status(500).json({ error: 'Unable to send verification email.' })
  }

  return res.status(200).json({ success: true })
}
