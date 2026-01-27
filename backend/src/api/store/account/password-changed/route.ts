import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import type { INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { ACCOUNT_FROM_EMAIL, BACKEND_URL, STORE_CORS } from '../../../../lib/constants'
import { EmailTemplates } from '../../../../modules/email-notifications/templates'

type PasswordChangedRequestBody = {
  email: string
  contactUrl?: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, contactUrl } = req.body as Partial<PasswordChangedRequestBody>

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' })
  }

  if (contactUrl && typeof contactUrl !== 'string') {
    return res.status(400).json({ error: 'Contact URL must be a string.' })
  }

  const notificationModuleService: INotificationModuleService = req.scope.resolve(
    Modules.NOTIFICATION
  )

  const storeOrigins = STORE_CORS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []
  const storeBaseUrl = storeOrigins.find(Boolean) ?? BACKEND_URL
  const resolvedContactUrl = contactUrl ?? `${storeBaseUrl}/support`

  try {
    await notificationModuleService.createNotifications({
      to: email,
      channel: 'email',
      from: ACCOUNT_FROM_EMAIL,
      template: EmailTemplates.PASSWORD_CHANGED,
      data: {
        emailOptions: {
          replyTo: ACCOUNT_FROM_EMAIL,
          subject: 'Your Wellness Research Supply password was changed',
        },
        contactUrl: resolvedContactUrl,
        preview: 'Your password has been changed',
      },
    })
  } catch (error) {
    console.error('Error sending password changed notification:', error)
    return res.status(500).json({ error: 'Unable to send password change email.' })
  }

  return res.status(200).json({ success: true })
}
