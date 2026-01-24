import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import type { IEventBusModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

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

  const eventBus: IEventBusModuleService = req.scope.resolve(Modules.EVENT_BUS)

  await eventBus.emit([
    {
      name: 'customer.email_verification',
      data: {
        email,
        token,
        verificationLink,
      },
    },
  ])

  return res.status(200).json({ success: true })
}
