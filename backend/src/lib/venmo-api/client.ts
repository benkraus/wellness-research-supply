import { ApiClient } from "./api-client"
import { AuthenticationApi } from "./auth-api"
import { PaymentApi } from "./payment-api"
import { UserApi } from "./user-api"
import { validateAccessToken } from "./utils"

export type VenmoClientOptions = {
  accessToken: string
  baseUrl?: string
  userAgent?: string
  defaultHeaders?: Record<string, string>
}

export class VenmoClient {
  private apiClient: ApiClient
  private profilePromise: Promise<any> | null = null

  user: UserApi
  payment: PaymentApi | null = null

  constructor(options: VenmoClientOptions) {
    const token = validateAccessToken(options.accessToken)
    if (!token) {
      throw new Error("accessToken is required")
    }

    this.apiClient = new ApiClient({
      accessToken: token,
      baseUrl: options.baseUrl,
      userAgent: options.userAgent,
      defaultHeaders: options.defaultHeaders,
    })

    this.user = new UserApi(this.apiClient)
  }

  async initialize(): Promise<void> {
    if (!this.profilePromise) {
      this.profilePromise = this.user.getMyProfile()
    }

    const profile = await this.profilePromise
    this.payment = new PaymentApi(profile, this.apiClient)
  }

  async myProfile(forceUpdate = false) {
    return this.user.getMyProfile(forceUpdate)
  }

  static async logOut(accessToken: string): Promise<boolean> {
    return AuthenticationApi.logOut(accessToken)
  }
}
