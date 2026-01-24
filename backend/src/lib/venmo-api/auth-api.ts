import { ApiClient } from "./api-client"
import { validateAccessToken } from "./utils"

export class AuthenticationApi {
  static async logOut(accessToken: string): Promise<boolean> {
    const token = validateAccessToken(accessToken)
    if (!token) {
      return false
    }

    const client = new ApiClient({ accessToken: token })
    await client.callApi({ path: "/oauth/access_token", method: "DELETE" })
    return true
  }
}
