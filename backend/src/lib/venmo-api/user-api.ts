import { ApiClient } from "./api-client"
import { ArgumentMissingError } from "./errors"
import { VenmoTransaction, VenmoUser } from "./types"

type PaginationOptions = {
  offset?: number
  limit?: number
}

type TransactionOptions = {
  limit?: number
  beforeId?: string
}

export class UserApi {
  private apiClient: ApiClient
  private profile?: VenmoUser

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient
  }

  async getMyProfile(forceUpdate = false): Promise<VenmoUser> {
    if (this.profile && !forceUpdate) {
      return this.profile
    }

    const response = await this.apiClient.callApi<{ data: { user: VenmoUser } }>(
      {
        path: "/account",
        method: "GET",
      }
    )

    const rawProfile = response.body.data.user as Record<string, unknown>
    const normalizedProfile: VenmoUser = {
      ...(rawProfile as VenmoUser),
      id: (rawProfile.id ?? rawProfile.external_id) as string,
      first_name: (rawProfile as any).first_name ?? (rawProfile as any).firstname,
      last_name: (rawProfile as any).last_name ?? (rawProfile as any).lastname,
    }

    this.profile = normalizedProfile
    return this.profile
  }

  async searchForUsers(
    query: string,
    options: PaginationOptions & { username?: boolean } = {}
  ): Promise<VenmoUser[]> {
    const params: Record<string, string | number> = {
      query,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    }

    if (options.username || query.includes("@")) {
      params.query = query.replace("@", "")
      params.type = "username"
    }

    const response = await this.apiClient.callApi<{ data: VenmoUser[] }>({
      path: "/users",
      method: "GET",
      query: params,
    })

    return response.body.data ?? []
  }

  async getUser(userId: string): Promise<VenmoUser> {
    if (!userId) {
      throw new ArgumentMissingError("userId is required")
    }

    const response = await this.apiClient.callApi<{ data: VenmoUser }>({
      path: `/users/${userId}`,
      method: "GET",
    })

    return response.body.data
  }

  async getUserByUsername(username: string): Promise<VenmoUser | null> {
    const users = await this.searchForUsers(username, { username: true })
    return users.find((user) => user.username === username) ?? null
  }

  async getUserFriendsList(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<VenmoUser[]> {
    if (!userId) {
      throw new ArgumentMissingError("userId is required")
    }

    const response = await this.apiClient.callApi<{ data: VenmoUser[] }>({
      path: `/users/${userId}/friends`,
      method: "GET",
      query: {
        limit: options.limit ?? 3337,
        offset: options.offset ?? 0,
      },
    })

    return response.body.data ?? []
  }

  async getUserTransactions(
    userId: string,
    options: TransactionOptions = {}
  ): Promise<VenmoTransaction[]> {
    if (!userId) {
      throw new ArgumentMissingError("userId is required")
    }

    const response = await this.apiClient.callApi<{ data: VenmoTransaction[] }>({
      path: `/stories/target-or-actor/${userId}`,
      method: "GET",
      query: {
        limit: options.limit ?? 50,
        ...(options.beforeId ? { before_id: options.beforeId } : {}),
      },
    })

    return response.body.data ?? []
  }

  async getTransactionsBetweenTwoUsers(
    userIdOne: string,
    userIdTwo: string,
    options: TransactionOptions = {}
  ): Promise<VenmoTransaction[]> {
    if (!userIdOne || !userIdTwo) {
      throw new ArgumentMissingError("userIdOne and userIdTwo are required")
    }

    const response = await this.apiClient.callApi<{ data: VenmoTransaction[] }>({
      path: `/stories/target-or-actor/${userIdOne}/target-or-actor/${userIdTwo}`,
      method: "GET",
      query: {
        limit: options.limit ?? 50,
        ...(options.beforeId ? { before_id: options.beforeId } : {}),
      },
    })

    return response.body.data ?? []
  }
}
