import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService, IPaymentModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { ORDERS_FROM_EMAIL } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

const VENMO_PROVIDER_ID = 'venmo'

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  const order = await orderModuleService.retrieveOrder(data.id, {
    relations: [
      'items',
      'summary',
      'shipping_address',
      'payment_collections',
      'payment_collections.payment_sessions',
      'payment_collections.payments'
    ]
  })
  const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)

  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      from: ORDERS_FROM_EMAIL,
      template: EmailTemplates.ORDER_PLACED,
      data: {
        emailOptions: {
          replyTo: ORDERS_FROM_EMAIL,
          subject: 'Your order has been placed'
        },
        order,
        shippingAddress,
        preview: 'Thank you for your order!'
      }
    })
  } catch (error) {
    console.error('Error sending order confirmation notification:', error)
  }

  try {
    let paymentModuleService: IPaymentModuleService | null = null

    try {
      paymentModuleService = container.resolve(Modules.PAYMENT)
    } catch (error) {
      paymentModuleService = null
    }

    if (!paymentModuleService) {
      return
    }

    const paymentCollections = (order as any).payment_collections ?? []
    const paymentSessions = paymentCollections.flatMap(
      (collection: any) => collection.payment_sessions ?? []
    )

    const venmoSession = paymentSessions.find(
      (session: any) => session.provider_id === VENMO_PROVIDER_ID
    )

    if (!venmoSession) {
      return
    }

    const paymentCollection = paymentCollections.find(
      (collection: any) => collection.id === venmoSession.payment_collection_id
    )

    if (paymentCollection) {
      const collectionMetadata = {
        ...(paymentCollection.metadata ?? {}),
        venmo_order_id: order.id,
        venmo_order_display_id: order.display_id,
      }

      await paymentModuleService.updatePaymentCollections(paymentCollection.id, {
        metadata: collectionMetadata,
      })
    }

    const venmoPayment = (paymentCollection?.payments ?? []).find(
      (payment: any) => payment.provider_id === VENMO_PROVIDER_ID
    )

    const existingVenmoPaymentId =
      (venmoSession.data as Record<string, unknown> | undefined)?.venmo_payment_id ??
      (order.metadata as Record<string, unknown> | undefined)?.venmo_payment_id

    const venmoPaymentId =
      venmoPayment?.data?.venmo_payment_id ??
      venmoPayment?.data?.id ??
      existingVenmoPaymentId

    const venmoPaymentIdData = venmoPaymentId
      ? { venmo_payment_id: venmoPaymentId }
      : {}

    const sessionData = {
      ...(venmoSession.data ?? {}),
      ...venmoPaymentIdData,
    }

    const nowIso = new Date().toISOString()
    const sessionMetadata = {
      ...(venmoSession.metadata ?? {}),
      venmo_poll: {
        attempts: 0,
        started_at: nowIso,
        next_poll_at: nowIso,
        last_status: venmoPayment?.data?.venmo_status ?? 'pending',
      },
    }

    await paymentModuleService.updatePaymentSession({
      id: venmoSession.id,
      data: sessionData,
      amount: venmoSession.amount,
      currency_code: venmoSession.currency_code,
      metadata: sessionMetadata,
    })

    const orderMetadata = {
      ...(order.metadata ?? {}),
      ...venmoPaymentIdData,
      venmo_status: venmoPayment?.data?.venmo_status ?? 'pending',
    }

    await orderModuleService.updateOrders(order.id, { metadata: orderMetadata })
  } catch (error) {
    console.error('Error initializing Venmo payment polling:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
