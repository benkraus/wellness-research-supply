import {
  ApiCallOptions,
  ApiClientOptions,
  ApiResponse,
  HttpMethod,
} from "./types"
import {
  HttpCodeError,
  InvalidHttpMethodError,
  ResourceNotFoundError,
} from "./errors"
import { buildQuery, validateAccessToken } from "./utils"

const DEFAULT_BASE_URL = "https://api.venmo.com/v1"
const DEFAULT_USER_AGENT = "Venmo/7.44.0 (iPhone; iOS 13.0; Scale/2.0)"

export class ApiClient {
  private accessToken?: string
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(options?: ApiClientOptions) {
    this.accessToken = validateAccessToken(options?.accessToken)
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL
    this.defaultHeaders = {
      "User-Agent": options?.userAgent ?? DEFAULT_USER_AGENT,
      ...(options?.defaultHeaders ?? {}),
    }

    if (this.accessToken) {
      this.defaultHeaders.Authorization = this.accessToken
    }
  }

  updateAccessToken(accessToken: string) {
    this.accessToken = validateAccessToken(accessToken)
    if (this.accessToken) {
      this.defaultHeaders.Authorization = this.accessToken
    }
  }

  async callApi<T = any>(options: ApiCallOptions): Promise<ApiResponse<T>> {
    if (!this.isValidMethod(options.method)) {
      throw new InvalidHttpMethodError()
    }

    const query = buildQuery(options.query)
    const url = `${this.baseUrl}${options.path}${query}`

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers ?? {}),
    }

    let body: string | undefined
    if (options.body) {
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(options.body)
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body,
    })

    const text = await response.text()
    let parsed: any = {}
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = {}
      }
    }

    const apiResponse: ApiResponse<T> = {
      status: response.status,
      headers: response.headers,
      body: parsed as T,
    }

    if (response.status >= 200 && response.status < 205) {
      return apiResponse
    }

    if (response.status === 400 && parsed?.error?.code === 283) {
      throw new ResourceNotFoundError()
    }

    if (
      parsed?.error?.code &&
      options.okErrorCodes &&
      options.okErrorCodes.includes(parsed.error.code)
    ) {
      return apiResponse
    }

    throw new HttpCodeError(response.status, parsed)
  }

  private isValidMethod(method: HttpMethod): boolean {
    return ["GET", "POST", "PUT", "DELETE"].includes(method)
  }
}
