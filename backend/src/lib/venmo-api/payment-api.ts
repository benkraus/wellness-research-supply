import { ApiClient } from "./api-client"
import {
  AlreadyRemindedPaymentError,
  ArgumentMissingError,
  GeneralPaymentError,
  NoPaymentMethodFoundError,
  NoPendingPaymentToUpdateError,
  NotEnoughBalanceError,
} from "./errors"
import {
  PaymentPrivacy,
  PaymentRole,
  VenmoPayment,
  VenmoPaymentMethod,
  VenmoPaymentRequestData,
  VenmoPaymentTarget,
  VenmoUser,
} from "./types"

const paymentErrorCodes = {
  alreadyRemindedError: 2907,
  noPendingPaymentError: 2901,
  noPendingPaymentError2: 2905,
  notEnoughBalanceError: 13006,
}

export class PaymentApi {
  private apiClient: ApiClient
  private profile: VenmoUser

  constructor(profile: VenmoUser, apiClient: ApiClient) {
    this.profile = profile
    this.apiClient = apiClient
  }

  async getChargePayments(limit = 100000): Promise<VenmoPayment[]> {
    return this.getPayments("charge", limit)
  }

  async getPayPayments(limit = 100000): Promise<VenmoPayment[]> {
    return this.getPayments("pay", limit)
  }

  async remindPayment(paymentId: string | number): Promise<boolean> {
    if (!paymentId) {
      throw new ArgumentMissingError("paymentId is required")
    }

    const response = await this.updatePayment("remind", paymentId)
    const errorCode = (response.body as any)?.error?.code

    if (errorCode) {
      if (errorCode === paymentErrorCodes.noPendingPaymentError2) {
        throw new NoPendingPaymentToUpdateError(paymentId, "remind")
      }
      throw new AlreadyRemindedPaymentError(paymentId)
    }

    return true
  }

  async cancelPayment(paymentId: string | number): Promise<boolean> {
    if (!paymentId) {
      throw new ArgumentMissingError("paymentId is required")
    }

    const response = await this.updatePayment("cancel", paymentId)
    const errorCode = (response.body as any)?.error?.code

    if (errorCode) {
      throw new NoPendingPaymentToUpdateError(paymentId, "cancel")
    }

    return true
  }

  async getPaymentMethods(): Promise<VenmoPaymentMethod[]> {
    const response = await this.apiClient.callApi<{ data: VenmoPaymentMethod[] }>({
      path: "/payment-methods",
      method: "GET",
    })

    return response.body.data ?? []
  }

  async sendMoney(
    amount: number,
    note: string,
    targetUserId: string,
    options: {
      fundingSourceId?: string
      privacySetting?: PaymentPrivacy
    } = {}
  ): Promise<boolean> {
    return this.sendOrRequestMoney({
      amount,
      note,
      targetUserId,
      isSendMoney: true,
      fundingSourceId: options.fundingSourceId,
      privacySetting: options.privacySetting ?? PaymentPrivacy.PRIVATE,
    })
  }

  async requestMoney(
    amount: number,
    note: string,
    targetUserId: string,
    options: {
      privacySetting?: PaymentPrivacy
    } = {}
  ): Promise<boolean> {
    return this.sendOrRequestMoney({
      amount,
      note,
      targetUserId,
      isSendMoney: false,
      privacySetting: options.privacySetting ?? PaymentPrivacy.PRIVATE,
    })
  }

  async getDefaultPaymentMethod(): Promise<VenmoPaymentMethod> {
    const methods = await this.getPaymentMethods()
    const defaultMethod = methods.find(
      (method) => method.peer_payment_role === PaymentRole.DEFAULT
    )

    if (!defaultMethod) {
      throw new NoPaymentMethodFoundError()
    }

    return defaultMethod
  }

  private async getPayments(
    action: "charge" | "pay",
    limit: number
  ): Promise<VenmoPayment[]> {
    const response = await this.apiClient.callApi<{ data: VenmoPayment[] }>({
      path: "/payments",
      method: "GET",
      query: {
        action,
        actor: this.profile.id,
        limit,
      },
    })

    return response.body.data ?? []
  }

  async requestPayment(input: {
    amount: number
    note: string
    target: VenmoPaymentTarget
    requestUuid: string
    metadata?: Record<string, unknown>
    audience?: PaymentPrivacy | "public" | "friends" | "private"
  }): Promise<VenmoPaymentRequestData> {
    const body: Record<string, unknown> = {
      amount: -Math.abs(input.amount),
      audience: input.audience ?? PaymentPrivacy.PRIVATE,
      note: input.note,
      uuid: input.requestUuid,
    }

    if (input.metadata) {
      body.metadata = input.metadata
    }

    if (input.target.phone) {
      body.phone = input.target.phone
    } else if (input.target.email) {
      body.email = input.target.email
    } else if (input.target.userId) {
      body.user_id = input.target.userId
    } else {
      throw new ArgumentMissingError("target is required")
    }

    const response = await this.apiClient.callApi<{ data: VenmoPaymentRequestData }>(
      {
        path: "/payments",
        method: "POST",
        body,
      }
    )

    return response.body.data
  }

  async getPayment(paymentId: string | number): Promise<VenmoPayment> {
    if (!paymentId) {
      throw new ArgumentMissingError("paymentId is required")
    }

    const response = await this.apiClient.callApi<{ data: VenmoPayment }>({
      path: `/payments/${paymentId}`,
      method: "GET",
    })

    return response.body.data
  }

  async listPendingPayments(
    actorId: string,
    limit = 20
  ): Promise<VenmoPayment[]> {
    if (!actorId) {
      throw new ArgumentMissingError("actorId is required")
    }

    const response = await this.apiClient.callApi<{ data: VenmoPayment[] }>({
      path: "/payments",
      method: "GET",
      query: {
        actor: actorId,
        limit,
        status: "pending,held",
      },
    })

    return response.body.data ?? []
  }

  private async updatePayment(action: string, paymentId: string | number) {
    return this.apiClient.callApi({
      path: `/payments/${paymentId}`,
      method: "PUT",
      body: { action },
      okErrorCodes: [
        paymentErrorCodes.alreadyRemindedError,
        paymentErrorCodes.noPendingPaymentError,
        paymentErrorCodes.noPendingPaymentError2,
      ],
    })
  }

  private async sendOrRequestMoney(options: {
    amount: number
    note: string
    targetUserId: string
    isSendMoney: boolean
    fundingSourceId?: string
    privacySetting: PaymentPrivacy
  }): Promise<boolean> {
    const amount = Math.abs(options.amount)
    const normalizedAmount = options.isSendMoney ? amount : -amount

    const body: Record<string, unknown> = {
      user_id: options.targetUserId,
      audience: options.privacySetting,
      amount: normalizedAmount,
      note: options.note,
    }

    if (options.isSendMoney) {
      let fundingSourceId = options.fundingSourceId
      if (!fundingSourceId) {
        const method = await this.getDefaultPaymentMethod()
        fundingSourceId = method.id
      }
      body.funding_source_id = fundingSourceId
    }

    const response = await this.apiClient.callApi<{ data: any }>({
      path: "/payments",
      method: "POST",
      body,
    })

    const errorCode = response.body?.data?.error_code
    if (errorCode) {
      if (errorCode === paymentErrorCodes.notEnoughBalanceError) {
        throw new NotEnoughBalanceError(amount, options.targetUserId)
      }
      const error = response.body?.data
      throw new GeneralPaymentError(
        `${error?.title ?? "Unknown error"}\n${error?.error_msg ?? ""}`
      )
    }

    return true
  }
}
