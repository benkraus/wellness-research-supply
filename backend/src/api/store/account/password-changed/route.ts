import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import type { IEventBusModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

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

  const eventBus: IEventBusModuleService = req.scope.resolve(Modules.EVENT_BUS)

  await eventBus.emit([
    {
      name: 'customer.password_changed',
      data: {
        email,
        contactUrl,
      },
    },
  ])

  return res.status(200).json({ success: true })
}
