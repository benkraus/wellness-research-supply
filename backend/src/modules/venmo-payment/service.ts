import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
  Logger,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import { randomUUID } from "crypto"

import { VenmoClient } from "../../lib/venmo-api/client"
import {
  PaymentPrivacy,
  VenmoPaymentTarget,
} from "../../lib/venmo-api"

type InjectedDependencies = {
  logger: Logger
}

export type VenmoProviderOptions = {
  accessToken: string
  sessionId?: string
  deviceId?: string
  cookie?: string
  userAgent?: string
  audience?: "public" | "friends" | "private"
  targetPhone?: string
  targetEmail?: string
  targetUserId?: string
  actorId?: string
  noteTemplate?: string
  acceptLanguage?: string
}

type VenmoPaymentData = {
  venmo_payment_id?: string
  venmo_request_uuid?: string
  venmo_status?: string
  venmo_action?: string
  venmo_amount?: number
  venmo_note?: string
  venmo_target?: Record<string, unknown>
  venmo_created_at?: string
}

const DEFAULT_NOTE_TEMPLATE = "Order {session_id}"

class VenmoPaymentProviderService extends AbstractPaymentProvider<VenmoProviderOptions> {
  static identifier = "venmo"
  protected logger_: Logger
  protected options_: VenmoProviderOptions
  protected client_: VenmoClient

  constructor({ logger }: InjectedDependencies, options: VenmoProviderOptions) {
    // @ts-ignore
    super(...arguments)

    this.logger_ = logger
    this.options_ = options
    this.client_ = new VenmoClient(this.buildClientOptions(options))
  }

  static validateOptions(options: VenmoProviderOptions): void {
    const required = ["accessToken"]
    required.forEach((field) => {
      if (!(options as Record<string, unknown>)[field]) {
        throw new Error(`${field} is required in the Venmo provider options`)
      }
    })
  }

  private buildClientOptions(options: VenmoProviderOptions) {
    const defaultHeaders: Record<string, string> = {
      Accept: "application/json",
    }

    if (options.sessionId) {
      defaultHeaders["X-Session-ID"] = options.sessionId
    }

    if (options.deviceId) {
      defaultHeaders["device-id"] = options.deviceId
    }

    if (options.cookie) {
      defaultHeaders.Cookie = options.cookie
    }

    if (options.acceptLanguage) {
      defaultHeaders["Accept-Language"] = options.acceptLanguage
    }

    return {
      accessToken: options.accessToken,
      userAgent: options.userAgent,
      defaultHeaders,
    }
  }

  private getTarget(options: VenmoProviderOptions): VenmoPaymentTarget {
    if (options.targetPhone) {
      return { phone: options.targetPhone }
    }

    if (options.targetEmail) {
      return { email: options.targetEmail }
    }

    if (options.targetUserId) {
      return { userId: options.targetUserId }
    }

    return {}
  }

  private resolveTarget(data?: Record<string, unknown>): VenmoPaymentTarget {
    const override = data?.venmo_target as
      | { phone?: string; email?: string; userId?: string; user_id?: string }
      | undefined

    if (override) {
      if (override.phone) {
        return { phone: override.phone }
      }
      if (override.email) {
        return { email: override.email }
      }
      if (override.userId || override.user_id) {
        return { userId: override.userId ?? override.user_id }
      }
    }

    return this.getTarget(this.options_)
  }

  private renderNote(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "")
  }

  private normalizeAmount(amount: unknown): number {
    if (typeof amount === "object" && amount !== null) {
      const record = amount as Record<string, unknown>
      if (typeof record.numeric === "number") {
        return record.numeric
      }
      if (typeof record.value !== "undefined") {
        const numeric = Number(record.value)
        if (Number.isFinite(numeric)) {
          return numeric
        }
      }
      if (typeof (record as { toString?: () => string }).toString === "function") {
        const numeric = Number(record.toString())
        if (Number.isFinite(numeric)) {
          return numeric
        }
      }
    }

    const value = Number(amount)
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid amount: ${amount}`)
    }
    return value
  }

  private mapVenmoStatus(status?: string): PaymentSessionStatus {
    switch (status) {
      case "pending":
      case "held":
        return PaymentSessionStatus.PENDING
      case "cancelled":
        return PaymentSessionStatus.CANCELED
      case "complete":
      case "completed":
        return PaymentSessionStatus.CAPTURED
      case "failed":
        return PaymentSessionStatus.ERROR
      default:
        return PaymentSessionStatus.PENDING
    }
  }

  async initiatePayment({
    amount,
    currency_code,
    data,
  }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = (data?.session_id as string) ?? randomUUID()

    return {
      id: sessionId,
      status: PaymentSessionStatus.PENDING,
      data: {
        ...data,
        session_id: sessionId,
        amount,
        currency_code,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const sessionId = (input.data?.session_id as string) ?? randomUUID()
    const amount = this.normalizeAmount(input.data?.amount)
    const currencyCode = String(input.data?.currency_code ?? "")
    const noteTemplate = this.options_.noteTemplate ?? DEFAULT_NOTE_TEMPLATE

    const note = this.renderNote(noteTemplate, {
      session_id: sessionId,
      amount: amount.toFixed(2),
      currency: currencyCode.toUpperCase(),
    })

    const metadata = {
      sale_tax: {
        tax_exempt: false,
        taxes: [],
        amount_without_tax_cents: Math.round(amount * 100),
      },
    }

    const requestUuid = randomUUID()
    const target = this.resolveTarget(input.data)
    if (!target.phone && !target.email && !target.userId) {
      throw new Error("Missing Venmo target on payment session data")
    }
    const paymentApi = await this.getPaymentApi()
    const response = await paymentApi.requestPayment({
      amount,
      note,
      target,
      requestUuid,
      metadata,
      audience: (this.options_.audience as PaymentPrivacy) ?? PaymentPrivacy.PUBLIC,
    })

    const payment = response.payment
    const paymentData: VenmoPaymentData = {
      venmo_payment_id: payment.id,
      venmo_request_uuid: requestUuid,
      venmo_status: payment.status,
      venmo_action: payment.action,
      venmo_amount: payment.amount,
      venmo_note: payment.note,
      venmo_target: payment.target,
      venmo_created_at: payment.date_created,
    }

    return {
      status: this.mapVenmoStatus(payment.status),
      data: {
        ...input.data,
        ...paymentData,
        venmo_redirect_url: response.redirect_url,
      },
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const paymentId =
      (input.data?.venmo_payment_id as string) ?? (input.data?.id as string)

    if (!paymentId) {
      throw new Error("Missing Venmo payment ID when checking status")
    }

    const paymentApi = await this.getPaymentApi()
    const payment = await paymentApi.getPayment(paymentId)
    const status = this.mapVenmoStatus(payment.status)

    return {
      status,
      data: {
        ...input.data,
        venmo_status: payment.status,
      },
    }
  }

  async updatePayment({
    data,
  }: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return {
      status: PaymentSessionStatus.PENDING,
      data: data ?? {},
    }
  }

  async cancelPayment({ data }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const paymentId =
      (data?.venmo_payment_id as string) ?? (data?.id as string)

    if (!paymentId) {
      return { data: data ?? {} }
    }

    const paymentApi = await this.getPaymentApi()
    await paymentApi.cancelPayment(paymentId)
    let status: string | undefined

    try {
      const payment = await paymentApi.getPayment(paymentId)
      status = payment.status
    } catch (error) {
      status = "cancelled"
    }

    return {
      data: {
        ...data,
        venmo_status: status,
      },
    }
  }

  async capturePayment({ data }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    if (!data) {
      return { data: {} }
    }

    const status = await this.getPaymentStatus({ data })
    return { data: status.data ?? data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input)
  }

  async refundPayment(
    _input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    throw new Error("Venmo refunds are not supported by this provider")
  }

  async retrievePayment({ data }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const paymentId =
      (data?.venmo_payment_id as string) ?? (data?.id as string)

    if (!paymentId) {
      return { data: data ?? {} }
    }

    const paymentApi = await this.getPaymentApi()
    const payment = await paymentApi.getPayment(paymentId)
    return { data: { ...data, venmo_status: payment.status } }
  }

  async getWebhookActionAndData(
    _data: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  private async getPaymentApi() {
    await this.client_.initialize()
    if (!this.client_.payment) {
      throw new Error("Venmo payment API unavailable")
    }
    return this.client_.payment
  }
}

export default VenmoPaymentProviderService
