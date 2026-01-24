export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

export type ApiClientOptions = {
  accessToken?: string
  baseUrl?: string
  userAgent?: string
  defaultHeaders?: Record<string, string>
}

export type ApiCallOptions = {
  path: string
  method: HttpMethod
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  body?: Record<string, unknown> | undefined
  okErrorCodes?: number[]
}

export type ApiResponse<T> = {
  status: number
  headers: Headers
  body: T
}

export type VenmoUser = {
  id: string
  username: string
  first_name?: string
  last_name?: string
  display_name?: string
  phone?: string | null
  profile_picture_url?: string | null
  about?: string | null
  date_joined?: string
  is_group?: boolean
  is_active?: boolean
}

export type VenmoPayment = {
  id: string
  status?: string
  action?: string
  amount?: number
  note?: string
  audience?: string
  date_created?: string
  date_completed?: string | null
  date_reminded?: string | null
  actor?: Record<string, unknown>
  target?: Record<string, unknown>
}

export type VenmoPaymentTarget = {
  phone?: string
  email?: string
  userId?: string
}

export type VenmoPaymentRequestData = {
  payment: VenmoPayment
  redirect_url?: string
  balance?: string
}

export type VenmoPaymentMethod = {
  id: string
  peer_payment_role?: string
  name?: string
  type?: string
}

export type VenmoTransaction = Record<string, unknown>

export enum PaymentPrivacy {
  PRIVATE = "private",
  PUBLIC = "public",
  FRIENDS = "friends",
}

export enum PaymentRole {
  DEFAULT = "default",
  BACKUP = "backup",
  NONE = "none",
}
