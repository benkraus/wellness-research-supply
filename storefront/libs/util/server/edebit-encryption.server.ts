import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

type EDebitPayload = {
  account_name: string
  routing_number: string
  account_number: string
  bank_name: string
  phone: string
}

const VERSION = "v1"

const normalizeKey = (key: string) => {
  return createHash("sha256").update(key).digest()
}

export const encryptEdebitPayload = (payload: EDebitPayload, key: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", normalizeKey(key), iv)
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${VERSION}.${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`
}

export const decryptEdebitPayload = (token: string, key: string): EDebitPayload => {
  const parts = token.split(".")
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported eDebit encryption payload")
  }

  const [, ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, "base64")
  const tag = Buffer.from(tagB64, "base64")
  const data = Buffer.from(dataB64, "base64")

  const decipher = createDecipheriv("aes-256-gcm", normalizeKey(key), iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  const payload = JSON.parse(decrypted.toString("utf8")) as EDebitPayload

  return payload
}
