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
import { createDecipheriv, createHash } from "crypto"

type InjectedDependencies = {
  logger: Logger
}

export type EDebitProviderOptions = {
  clientId: string
  apiPassword: string
  endpoint?: string
  verificationMode?: "rtv" | "bv"
  checkMemoTemplate?: string
  statusCheckEnabled?: boolean
  encryptionKey?: string
}

type EDebitPaymentData = {
  edebit_result?: string
  edebit_result_description?: string
  edebit_verify_result?: string
  edebit_verify_description?: string
  edebit_check_number?: string
  edebit_check_id?: string
  edebit_status?: string
  edebit_account_last4?: string
  edebit_routing_last4?: string
}

type EDebitStatusResult = {
  result?: string
  resultDescription?: string
  verifyResult?: string
  verifyResultDescription?: string
  deleted?: string
  processed?: string
  rejected?: string
  checkNumber?: string
  checkId?: string
}

const DEFAULT_ENDPOINT = "https://www.greenbyphone.com/eCheck.asmx"
const DEFAULT_CHECK_MEMO_TEMPLATE = "Order {session_id}"

class EDebitPaymentProviderService extends AbstractPaymentProvider<EDebitProviderOptions> {
  static identifier = "edebit"
  protected logger_: Logger
  protected options_: EDebitProviderOptions

  constructor({ logger }: InjectedDependencies, options: EDebitProviderOptions) {
    // @ts-ignore
    super(...arguments)

    this.logger_ = logger
    this.options_ = options
  }

  static validateOptions(options: EDebitProviderOptions): void {
    const required = ["clientId", "apiPassword", "encryptionKey"]
    required.forEach((field) => {
      if (!(options as Record<string, unknown>)[field]) {
        throw new Error(`${field} is required in the eDebit provider options`)
      }
    })
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
    const amount = this.normalizeAmount(input.data?.amount)
    const currencyCode = String(input.data?.currency_code ?? "").toLowerCase()
    const sensitive = this.resolveSensitiveFields(input.data)

    if (currencyCode && currencyCode !== "usd") {
      throw new Error("eDebit only supports USD payments")
    }

    const payload = this.buildDraftPayload(input.data, amount)
    const method = this.getVerificationMethod()
    const xml = await this.postForm(method, payload)

    const result = this.readXmlTag(xml, "Result")
    const resultDescription = this.readXmlTag(xml, "ResultDescription")
    const verifyResult = this.readXmlTag(xml, "VerifyResult")
    const verifyResultDescription = this.readXmlTag(
      xml,
      "VerifyResultDescription"
    )
    const checkNumber = this.readXmlTag(xml, "CheckNumber")
    const checkId = this.readXmlTag(xml, "Check_ID")

    const status = this.mapVerifyStatus(result, verifyResult)

    const sanitized = this.sanitizePaymentData(input.data)

    const responseData: EDebitPaymentData = {
      edebit_result: result,
      edebit_result_description: resultDescription,
      edebit_verify_result: verifyResult,
      edebit_verify_description: verifyResultDescription,
      edebit_check_number: checkNumber,
      edebit_check_id: checkId,
      edebit_status: status,
      edebit_account_last4: this.last4(sensitive.accountNumber),
      edebit_routing_last4: this.last4(sensitive.routingNumber),
    }

    return {
      status,
      data: {
        ...sanitized,
        ...responseData,
      },
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const checkId = this.getString(input.data, "edebit_check_id")
    if (!checkId || !this.isStatusCheckEnabled()) {
      const existingStatus = this.getString(input.data, "edebit_status")
      const status = existingStatus
        ? (existingStatus as PaymentSessionStatus)
        : PaymentSessionStatus.PENDING
      return {
        status,
        data: input.data ?? {},
      }
    }

    const xml = await this.postForm("CheckStatus", {
      Client_ID: this.options_.clientId,
      ApiPassword: this.options_.apiPassword,
      Check_ID: checkId,
    })

    const statusResult: EDebitStatusResult = {
      result: this.readXmlTag(xml, "Result"),
      resultDescription: this.readXmlTag(xml, "ResultDescription"),
      verifyResult: this.readXmlTag(xml, "VerifyResult"),
      verifyResultDescription: this.readXmlTag(xml, "VerifyResultDescription"),
      deleted: this.readXmlTag(xml, "Deleted"),
      processed: this.readXmlTag(xml, "Processed"),
      rejected: this.readXmlTag(xml, "Rejected"),
      checkNumber: this.readXmlTag(xml, "CheckNumber"),
      checkId: this.readXmlTag(xml, "Check_ID"),
    }

    const status = this.mapStatusFromCheckStatus(statusResult)

    return {
      status,
      data: {
        ...input.data,
        edebit_status: status,
        edebit_result: statusResult.result,
        edebit_result_description: statusResult.resultDescription,
        edebit_verify_result: statusResult.verifyResult,
        edebit_verify_description: statusResult.verifyResultDescription,
        edebit_check_number: statusResult.checkNumber ?? input.data?.edebit_check_number,
        edebit_check_id: statusResult.checkId ?? checkId,
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
    const checkId = this.getString(data, "edebit_check_id")
    if (!checkId) {
      return { data: data ?? {} }
    }

    const xml = await this.postForm("CancelCheck", {
      Client_ID: this.options_.clientId,
      ApiPassword: this.options_.apiPassword,
      Check_ID: checkId,
    })

    const result = this.readXmlTag(xml, "Result")
    const resultDescription = this.readXmlTag(xml, "ResultDescription")

    if (!result) {
      throw new Error("eDebit cancel failed: missing Result in response")
    }

    if (result !== "0") {
      throw new Error(
        `eDebit cancel failed (${result}): ${resultDescription ?? "Unknown"}`
      )
    }

    return {
      data: {
        ...(data ?? {}),
        edebit_status: PaymentSessionStatus.CANCELED,
        edebit_cancel_result: result,
        edebit_cancel_result_description: resultDescription,
      },
    }
  }

  async capturePayment({ data }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    if (!data) {
      return { data: {} }
    }

    return {
      data,
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input)
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const checkId = this.getString(input.data, "edebit_check_id")
    if (!checkId) {
      throw new Error("Missing eDebit Check_ID for refund")
    }

    const amount = this.normalizeAmount(input.amount ?? input.data?.amount)
    const memo =
      this.getString(input.data, "edebit_refund_memo") ??
      this.options_.checkMemoTemplate ??
      "Refund"

    const xml = await this.postForm("RefundCheck", {
      Client_ID: this.options_.clientId,
      ApiPassword: this.options_.apiPassword,
      Check_ID: checkId,
      RefundMemo: memo,
      RefundAmount: amount.toFixed(2),
    })

    const result = this.readXmlTag(xml, "Result")
    const resultDescription = this.readXmlTag(xml, "ResultDescription")
    const refundCheckNumber = this.readXmlTag(xml, "RefundCheckNumber")
    const refundCheckId = this.readXmlTag(xml, "RefundCheck_ID")

    if (!result) {
      throw new Error("eDebit refund failed: missing Result in response")
    }

    if (result !== "0") {
      throw new Error(
        `eDebit refund failed (${result}): ${resultDescription ?? "Unknown"}`
      )
    }

    return {
      data: {
        ...(input.data ?? {}),
        edebit_refund_result: result,
        edebit_refund_result_description: resultDescription,
        edebit_refund_check_number: refundCheckNumber,
        edebit_refund_check_id: refundCheckId,
      },
    }
  }

  async retrievePayment({ data }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const status = await this.getPaymentStatus({ data })
    return { data: status.data ?? data }
  }

  async getWebhookActionAndData(
    _data: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  private getVerificationMethod() {
    if (this.options_.verificationMode?.toLowerCase() === "bv") {
      return "OneTimeDraftBV"
    }
    return "OneTimeDraftRTV"
  }

  private isStatusCheckEnabled(): boolean {
    if (typeof this.options_.statusCheckEnabled === "boolean") {
      return this.options_.statusCheckEnabled
    }
    return true
  }

  private buildDraftPayload(data: Record<string, unknown> | undefined, amount: number) {
    const sensitive = this.resolveSensitiveFields(data)
    const accountName = sensitive.accountName
    const routingNumber = sensitive.routingNumber
    const accountNumber = sensitive.accountNumber
    const bankName = sensitive.bankName
    const phone = sensitive.phone
    const email = this.requiredString(data, "edebit_email")
    const address1 = this.requiredString(data, "edebit_address1")
    const city = this.requiredString(data, "edebit_city")
    const state = this.requiredString(data, "edebit_state")
    const zip = this.requiredString(data, "edebit_zip")
    const country = this.requiredString(data, "edebit_country")
    const address2 = this.getString(data, "edebit_address2") ?? ""
    const checkNumber = this.getString(data, "edebit_check_number")
    const checkDate =
      this.getString(data, "edebit_check_date") ?? this.formatCheckDate(new Date())
    const checkMemoTemplate =
      this.options_.checkMemoTemplate ?? DEFAULT_CHECK_MEMO_TEMPLATE
    const checkMemo = this.renderTemplate(checkMemoTemplate, {
      session_id: this.getString(data, "session_id") ?? "",
      cart_id: this.getString(data, "cart_id") ?? "",
      email,
    })

    return {
      Client_ID: this.options_.clientId,
      ApiPassword: this.options_.apiPassword,
      Name: accountName,
      EmailAddress: email,
      Phone: this.formatPhone(phone),
      Address1: address1,
      Address2: address2,
      City: city,
      State: state,
      Zip: zip,
      Country: country.toUpperCase(),
      RoutingNumber: this.onlyDigits(routingNumber),
      AccountNumber: this.onlyDigits(accountNumber),
      BankName: bankName,
      CheckMemo: checkMemo,
      CheckAmount: amount.toFixed(2),
      CheckDate: checkDate,
      ...(checkNumber ? { CheckNumber: checkNumber } : {}),
    }
  }

  private sanitizePaymentData(data?: Record<string, unknown>) {
    if (!data) return {}

    const sanitized = { ...data }
    delete sanitized.edebit_account_number
    delete sanitized.edebit_routing_number
    delete sanitized.edebit_encrypted
    return sanitized
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

  private onlyDigits(value: string) {
    return value.replace(/\D/g, "")
  }

  private formatPhone(phone: string) {
    const digits = this.onlyDigits(phone)
    if (!digits) return phone

    const normalized =
      digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits

    if (normalized.length !== 10) {
      return digits
    }

    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`
  }

  private formatCheckDate(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const year = String(date.getFullYear())
    return `${month}/${day}/${year}`
  }

  private renderTemplate(template: string, values: Record<string, string>) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "")
  }

  private mapVerifyStatus(
    result?: string | null,
    verifyResult?: string | null
  ): PaymentSessionStatus {
    if (!result || result !== "0") {
      return PaymentSessionStatus.ERROR
    }

    switch (String(verifyResult ?? "")) {
      case "0":
        return PaymentSessionStatus.CAPTURED
      case "1":
      case "4":
        return PaymentSessionStatus.PENDING
      case "2":
      case "3":
        return PaymentSessionStatus.ERROR
      default:
        return PaymentSessionStatus.PENDING
    }
  }

  private mapStatusFromCheckStatus(result: EDebitStatusResult): PaymentSessionStatus {
    if (result.result && result.result !== "0") {
      return PaymentSessionStatus.ERROR
    }

    if (this.parseBoolean(result.deleted)) {
      return PaymentSessionStatus.CANCELED
    }

    if (this.parseBoolean(result.rejected)) {
      return PaymentSessionStatus.ERROR
    }

    if (this.parseBoolean(result.processed)) {
      return PaymentSessionStatus.CAPTURED
    }

    return this.mapVerifyStatus(result.result, result.verifyResult)
  }

  private parseBoolean(value?: string | null) {
    if (!value) return false
    const normalized = value.trim().toLowerCase()
    return ["1", "true", "yes", "y"].includes(normalized)
  }

  private requiredString(
    data: Record<string, unknown> | undefined,
    key: string
  ): string {
    const value = this.getString(data, key)
    if (!value) {
      throw new Error(`Missing required eDebit field: ${key}`)
    }
    return value
  }

  private getString(
    data: Record<string, unknown> | undefined,
    key: string
  ): string | undefined {
    const value = data?.[key]
    if (typeof value === "string") {
      return value.trim()
    }
    if (typeof value === "number") {
      return String(value)
    }
    return undefined
  }

  private last4(value?: string) {
    if (!value) return undefined
    const digits = this.onlyDigits(value)
    if (!digits) return undefined
    return digits.slice(-4)
  }

  private resolveSensitiveFields(data?: Record<string, unknown>) {
    const encrypted = this.getString(data, "edebit_encrypted")
    if (encrypted) {
      const payload = this.decryptEdebitPayload(encrypted)
      return {
        accountName: payload.account_name,
        routingNumber: payload.routing_number,
        accountNumber: payload.account_number,
        bankName: payload.bank_name,
        phone: payload.phone,
      }
    }

    return {
      accountName: this.requiredString(data, "edebit_account_name"),
      routingNumber: this.requiredString(data, "edebit_routing_number"),
      accountNumber: this.requiredString(data, "edebit_account_number"),
      bankName: this.requiredString(data, "edebit_bank_name"),
      phone: this.requiredString(data, "edebit_phone"),
    }
  }

  private decryptEdebitPayload(token: string) {
    const key = this.options_.encryptionKey
    if (!key) {
      throw new Error("Missing eDebit encryption key")
    }

    const parts = token.split(".")
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new Error("Unsupported eDebit encryption payload")
    }

    const [, ivB64, tagB64, dataB64] = parts
    const iv = Buffer.from(ivB64, "base64")
    const tag = Buffer.from(tagB64, "base64")
    const data = Buffer.from(dataB64, "base64")

    const decipher = createDecipheriv("aes-256-gcm", this.normalizeKey(key), iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    const payload = JSON.parse(decrypted.toString("utf8")) as {
      account_name: string
      routing_number: string
      account_number: string
      bank_name: string
      phone: string
    }

    return payload
  }

  private normalizeKey(key: string) {
    return createHash("sha256").update(key).digest()
  }

  private getEndpoint() {
    const base = (this.options_.endpoint ?? DEFAULT_ENDPOINT).trim()
    return base.endsWith("/") ? base.slice(0, -1) : base
  }

  private async postForm(method: string, payload: Record<string, string>) {
    const url = `${this.getEndpoint()}/${method}`
    const params = new URLSearchParams()
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      params.append(key, value)
    })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "text/xml, application/xml",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const text = await response.text()
    if (!response.ok) {
      const snippet = text.slice(0, 500)
      this.logger_.error(`eDebit API ${method} failed: ${response.status} ${snippet}`)
      throw new Error(`eDebit API ${method} failed with status ${response.status}`)
    }

    return text
  }

  private readXmlTag(xml: string, tag: string) {
    const lower = xml.toLowerCase()
    const tagLower = tag.toLowerCase()
    let pos = 0

    while (pos < lower.length) {
      const lt = lower.indexOf("<", pos)
      if (lt === -1) return undefined

      if (lower.startsWith("<?", lt)) {
        const endDecl = lower.indexOf("?>", lt + 2)
        if (endDecl === -1) return undefined
        pos = endDecl + 2
        continue
      }

      if (lower.startsWith("<!--", lt)) {
        const endComment = lower.indexOf("-->", lt + 4)
        if (endComment === -1) return undefined
        pos = endComment + 3
        continue
      }

      if (lower.startsWith("</", lt)) {
        pos = lt + 2
        continue
      }

      const endTag = lower.indexOf(">", lt + 1)
      if (endTag === -1) return undefined

      const tagName = this.extractTagName(lower.slice(lt + 1, endTag))
      if (tagName && tagName.local === tagLower) {
        const closeIndex = this.findClosingTag(lower, tagLower, endTag + 1)
        if (!closeIndex) return undefined
        const raw = xml.slice(endTag + 1, closeIndex.start)
        return this.decodeXmlEntities(raw.trim())
      }

      pos = endTag + 1
    }

    return undefined
  }

  private findClosingTag(lower: string, tagLower: string, from: number) {
    let pos = from
    while (pos < lower.length) {
      const lt = lower.indexOf("</", pos)
      if (lt === -1) return null
      const endTag = lower.indexOf(">", lt + 2)
      if (endTag === -1) return null
      const tagName = this.extractTagName(lower.slice(lt + 2, endTag))
      if (tagName && tagName.local === tagLower) {
        return { start: lt, end: endTag }
      }
      pos = endTag + 1
    }
    return null
  }

  private extractTagName(source: string) {
    const trimmed = source.trim()
    if (!trimmed) return null

    let end = trimmed.length
    for (let i = 0; i < trimmed.length; i += 1) {
      const char = trimmed[i]
      if (char === " " || char === "\t" || char === "\n" || char === "\r" || char === "/") {
        end = i
        break
      }
    }

    const full = trimmed.slice(0, end)
    if (!full) return null
    const parts = full.split(":")
    return {
      full,
      local: parts[parts.length - 1],
    }
  }

  private decodeXmlEntities(value: string) {
    return value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  }
}

export default EDebitPaymentProviderService
