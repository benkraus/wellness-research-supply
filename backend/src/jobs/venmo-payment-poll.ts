import { MedusaContainer } from "@medusajs/types"
import { Modules, PaymentSessionStatus } from "@medusajs/framework/utils"
import { IPaymentModuleService, IOrderModuleService, INotificationModuleService, Logger } from "@medusajs/framework/types"

import {
  VENMO_ACCESS_TOKEN,
  VENMO_SESSION_ID,
  VENMO_DEVICE_ID,
  VENMO_COOKIE,
  VENMO_USER_AGENT,
  VENMO_ACCEPT_LANGUAGE,
  VENMO_POLL_ENABLED,
  VENMO_POLL_BASE_SECONDS_SAFE,
  VENMO_POLL_MAX_SECONDS_SAFE,
  VENMO_POLL_MAX_ATTEMPTS_SAFE,
  VENMO_POLL_MAX_DAYS_SAFE,
  ORDERS_FROM_EMAIL,
  ORDERS_NOTIFICATION_EMAIL,
} from "../lib/constants"
import { VenmoClient } from "../lib/venmo-api/client"
import { EmailTemplates } from "../modules/email-notifications/templates"

const VENMO_PROVIDER_ID = "venmo"

type PollState = {
  attempts: number
  started_at?: string
  next_poll_at?: string
  last_status?: string
  last_checked_at?: string
  stopped_at?: string
  last_error?: string
}

function getLogger(container: MedusaContainer): Logger {
  try {
    return container.resolve("logger") as Logger
  } catch (error) {
    return console as unknown as Logger
  }
}

function shouldPoll(state: PollState | null, now: Date): boolean {
  if (!state) {
    return true
  }

  if (state.stopped_at) {
    return false
  }

  if (!state.next_poll_at) {
    return true
  }

  return new Date(state.next_poll_at).getTime() <= now.getTime()
}

function buildNextPollState(
  state: PollState | null,
  now: Date,
  status?: string,
  error?: string
): PollState {
  const attempts = (state?.attempts ?? 0) + 1
  const startedAt = state?.started_at ?? now.toISOString()
  const delaySeconds = Math.min(
    VENMO_POLL_BASE_SECONDS_SAFE * Math.pow(2, attempts - 1),
    VENMO_POLL_MAX_SECONDS_SAFE
  )

  return {
    attempts,
    started_at: startedAt,
    next_poll_at: new Date(now.getTime() + delaySeconds * 1000).toISOString(),
    last_status: status ?? state?.last_status,
    last_checked_at: now.toISOString(),
    last_error: error,
  }
}

function isExpired(state: PollState | null, now: Date): boolean {
  if (!state?.started_at) {
    return false
  }

  const started = new Date(state.started_at)
  if (Number.isNaN(started.getTime())) {
    return false
  }

  const maxMillis = VENMO_POLL_MAX_DAYS_SAFE * 24 * 60 * 60 * 1000
  return now.getTime() - started.getTime() >= maxMillis
}

export default async function venmoPaymentPollJob(container: MedusaContainer) {
  if (!VENMO_POLL_ENABLED) {
    return
  }

  if (!VENMO_ACCESS_TOKEN || !VENMO_SESSION_ID || !VENMO_DEVICE_ID) {
    return
  }

  const logger = getLogger(container)
  const paymentModuleService: IPaymentModuleService = container.resolve(Modules.PAYMENT)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  let notificationModuleService: INotificationModuleService | null = null

  try {
    notificationModuleService = container.resolve(Modules.NOTIFICATION)
  } catch (error) {
    notificationModuleService = null
  }
  const client = new VenmoClient({
    accessToken: VENMO_ACCESS_TOKEN,
    userAgent: VENMO_USER_AGENT,
    defaultHeaders: {
      Accept: "application/json",
      ...(VENMO_SESSION_ID ? { "X-Session-ID": VENMO_SESSION_ID } : {}),
      ...(VENMO_DEVICE_ID ? { "device-id": VENMO_DEVICE_ID } : {}),
      ...(VENMO_COOKIE ? { Cookie: VENMO_COOKIE } : {}),
      ...(VENMO_ACCEPT_LANGUAGE
        ? { "Accept-Language": VENMO_ACCEPT_LANGUAGE }
        : {}),
    },
  })

  const sessions = await paymentModuleService.listPaymentSessions(
    { provider_id: VENMO_PROVIDER_ID },
    { relations: ["payment_collection", "payment"] }
  )

  if (!sessions.length) {
    return
  }

  const now = new Date()
  let clientInitialized = false
  let clientInitError: string | null = null

  for (const session of sessions) {
    if (
      session.status !== PaymentSessionStatus.PENDING &&
      session.status !== PaymentSessionStatus.REQUIRES_MORE
    ) {
      continue
    }

    const state = (session.metadata?.venmo_poll as PollState) ?? null

    if (!shouldPoll(state, now)) {
      continue
    }

    if (isExpired(state, now) || (state?.attempts ?? 0) >= VENMO_POLL_MAX_ATTEMPTS_SAFE) {
      const stoppedState: PollState = {
        ...(state ?? { attempts: 0, started_at: now.toISOString() }),
        stopped_at: now.toISOString(),
        last_checked_at: now.toISOString(),
      }

      await paymentModuleService.updatePaymentSession({
        id: session.id,
        data: session.data,
        amount: session.amount,
        currency_code: session.currency_code,
        metadata: { ...(session.metadata ?? {}), venmo_poll: stoppedState },
      })

      continue
    }

    const paymentId =
      (session.data?.venmo_payment_id as string) ??
      (session.data?.id as string) ??
      (session.payment?.data?.venmo_payment_id as string) ??
      (session.payment?.data?.id as string)

    if (!paymentId) {
      const nextState = buildNextPollState(
        state,
        now,
        "missing_payment_id",
        "Missing Venmo payment ID"
      )

      await paymentModuleService.updatePaymentSession({
        id: session.id,
        data: session.data,
        amount: session.amount,
        currency_code: session.currency_code,
        metadata: { ...(session.metadata ?? {}), venmo_poll: nextState },
      })

      continue
    }

    if (!clientInitialized) {
      if (!clientInitError) {
        try {
          await client.initialize()
          clientInitialized = true
        } catch (error) {
          clientInitError = String(error)
          logger.warn(`Venmo client initialization failed: ${error}`)
        }
      }

      if (!clientInitialized) {
        const initErrorMessage = clientInitError
          ? `Venmo client initialization failed: ${clientInitError}`
          : "Venmo client initialization failed"
        const nextState = buildNextPollState(
          state,
          now,
          state?.last_status,
          initErrorMessage
        )

        await paymentModuleService.updatePaymentSession({
          id: session.id,
          data: session.data,
          amount: session.amount,
          currency_code: session.currency_code,
          metadata: { ...(session.metadata ?? {}), venmo_poll: nextState },
        })

        continue
      }
    }

    try {
      const payment = await client.payment!.getPayment(paymentId)
      const status = payment.status

      if (status === "complete" || status === "completed") {
        if (session.payment?.id) {
          await paymentModuleService.capturePayment({
            payment_id: session.payment.id,
          })
        }

        const completedState: PollState = {
          attempts: (state?.attempts ?? 0) + 1,
          last_status: status,
          last_checked_at: now.toISOString(),
          stopped_at: now.toISOString(),
        }

        await paymentModuleService.updatePaymentSession({
          id: session.id,
          data: session.data,
          amount: session.amount,
          currency_code: session.currency_code,
          metadata: { ...(session.metadata ?? {}), venmo_poll: completedState },
        })

        const paymentCollection = session.payment_collection
        const orderId =
          paymentCollection?.metadata?.venmo_order_id ??
          paymentCollection?.metadata?.order_id

        if (paymentCollection?.id) {
          await paymentModuleService.updatePaymentCollections(
            paymentCollection.id,
            {
              metadata: {
                ...(paymentCollection.metadata ?? {}),
                venmo_status: "paid",
                venmo_paid_at: now.toISOString(),
              },
            }
          )
        }

        if (orderId) {
          const order = await orderModuleService.retrieveOrder(orderId as string, {
            relations: ["items", "summary", "shipping_address"],
          })
          const shippingAddress = order.shipping_address
            ? await (orderModuleService as any).orderAddressService_.retrieve(
                order.shipping_address.id
              )
            : null

          const alreadyNotified = Boolean(
            (order.metadata ?? {}).venmo_processing_notified_at
          )

          let notifiedAt: string | undefined
          if (
            notificationModuleService &&
            shippingAddress &&
            !alreadyNotified
          ) {
            try {
              await notificationModuleService.createNotifications({
                to: order.email,
                channel: "email",
                from: ORDERS_FROM_EMAIL,
                template: EmailTemplates.ORDER_PROCESSING,
                data: {
                  emailOptions: {
                    replyTo: ORDERS_FROM_EMAIL,
                    subject: "Your order is processing",
                  },
                  order,
                  shippingAddress,
                  preview: "Payment received. Your order is processing.",
                },
              })
            } catch (error) {
              logger.warn(
                `Failed to send order processing email for ${order.id}: ${error}`
              )
            }

            if (ORDERS_NOTIFICATION_EMAIL) {
              try {
                await notificationModuleService.createNotifications({
                  to: ORDERS_NOTIFICATION_EMAIL,
                  channel: "email",
                  from: ORDERS_FROM_EMAIL,
                  template: EmailTemplates.ORDER_NOTIFICATION,
                  data: {
                    emailOptions: {
                      replyTo: ORDERS_FROM_EMAIL,
                      subject: `New paid order #${order.display_id}`,
                    },
                    order,
                    shippingAddress,
                    preview: "New paid order received.",
                  },
                })
              } catch (error) {
                logger.warn(
                  `Failed to send order notification for ${order.id}: ${error}`
                )
              }
            }

            notifiedAt = now.toISOString()
          }

          const orderMetadata = {
            ...(order.metadata ?? {}),
            venmo_status: "paid",
            venmo_paid_at: now.toISOString(),
            fulfillment_stage: "preparing_for_shipment",
            ...(notifiedAt
              ? { venmo_processing_notified_at: notifiedAt }
              : {}),
          }

          await orderModuleService.updateOrders(order.id, {
            metadata: orderMetadata,
          })
        }

        continue
      }

      if (status === "cancelled") {
        if (session.payment?.id) {
          await paymentModuleService.cancelPayment(session.payment.id)
        }

        const canceledState: PollState = {
          attempts: (state?.attempts ?? 0) + 1,
          last_status: status,
          last_checked_at: now.toISOString(),
          stopped_at: now.toISOString(),
        }

        await paymentModuleService.updatePaymentSession({
          id: session.id,
          data: session.data,
          amount: session.amount,
          currency_code: session.currency_code,
          metadata: { ...(session.metadata ?? {}), venmo_poll: canceledState },
        })

        continue
      }

      const nextState = buildNextPollState(state, now, status)
      await paymentModuleService.updatePaymentSession({
        id: session.id,
        data: session.data,
        amount: session.amount,
        currency_code: session.currency_code,
        metadata: { ...(session.metadata ?? {}), venmo_poll: nextState },
      })
    } catch (error) {
      logger.warn(`Venmo poll failed for session ${session.id}: ${error}`)
      const nextState = buildNextPollState(
        state,
        now,
        state?.last_status,
        String(error)
      )

      await paymentModuleService.updatePaymentSession({
        id: session.id,
        data: session.data,
        amount: session.amount,
        currency_code: session.currency_code,
        metadata: { ...(session.metadata ?? {}), venmo_poll: nextState },
      })
    }
  }
}

export const config = {
  name: "venmo-payment-poll",
  schedule: "*/1 * * * *",
}
