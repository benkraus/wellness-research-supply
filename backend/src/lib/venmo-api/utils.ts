export function validateAccessToken(accessToken?: string): string | undefined {
  if (!accessToken) {
    return undefined
  }

  const match = accessToken.match(/^(Bearer)?\s*(.+)$/i)
  const token = match ? match[2] : accessToken
  return `Bearer ${token}`
}

export function buildQuery(
  query?: Record<string, string | number | boolean | undefined>
): string {
  if (!query) {
    return ""
  }

  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return
    }
    params.set(key, String(value))
  })

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}
