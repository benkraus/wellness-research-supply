export class AuthenticationFailedError extends Error {
  constructor(message?: string) {
    super(message ?? "Authentication failed.")
    this.name = "AuthenticationFailedError"
  }
}

export class InvalidHttpMethodError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "Method is not valid. Method must be POST, PUT, GET or DELETE."
    )
    this.name = "InvalidHttpMethodError"
  }
}

export class ResourceNotFoundError extends Error {
  constructor(message?: string) {
    super(message ?? "400 Bad Request. Couldn't find the requested resource.")
    this.name = "ResourceNotFoundError"
  }
}

export class HttpCodeError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(
      message ??
        `HTTP Status code is invalid. Could not make the request because -> ${status}.`
    )
    this.name = "HttpCodeError"
    this.status = status
    this.body = body
  }
}

export class ArgumentMissingError extends Error {
  constructor(message?: string) {
    super(message ?? "One of required arguments must be passed to this method.")
    this.name = "ArgumentMissingError"
  }
}

export class NoPaymentMethodFoundError extends Error {
  constructor(message?: string) {
    super(message ?? "No eligible payment method found.")
    this.name = "NoPaymentMethodFoundError"
  }
}

export class AlreadyRemindedPaymentError extends Error {
  constructor(paymentId: string | number) {
    super(
      `A reminder has already been sent to the recipient of this transaction: ${paymentId}.`
    )
    this.name = "AlreadyRemindedPaymentError"
  }
}

export class NoPendingPaymentToUpdateError extends Error {
  constructor(paymentId: string | number, action: string) {
    super(
      `There is no *pending* transaction with the specified id: ${paymentId}, to be ${action}ed.`
    )
    this.name = "NoPendingPaymentToUpdateError"
  }
}

export class NotEnoughBalanceError extends Error {
  constructor(amount: number, targetUserId: string) {
    super(
      `Failed to complete transaction of $${amount} to ${targetUserId}. ` +
        "There is not enough balance on the default payment method to complete the transaction."
    )
    this.name = "NotEnoughBalanceError"
  }
}

export class GeneralPaymentError extends Error {
  constructor(message: string) {
    super(`Transaction failed. ${message}`)
    this.name = "GeneralPaymentError"
  }
}
