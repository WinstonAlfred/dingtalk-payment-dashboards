// Signs and verifies session cookies with HMAC-SHA256 via the Web Crypto
// API — no external auth library, no database. Works unmodified in both
// the Edge middleware runtime and Node API routes.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 hours

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let str = ""
  arr.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64urlToBytes(b64url: string): Uint8Array {
  const padded = b64url.padEnd(b64url.length + ((4 - (b64url.length % 4)) % 4), "=")
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/")
  const str = atob(b64)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes
}

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it to .env.local for development and to your Vercel project's environment variables before deploying."
    )
  }
  return secret
}

export async function createSessionToken(username: string): Promise<string> {
  const secret = requireSecret()
  const payload = JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_SECONDS * 1000 })
  const payloadB64 = base64url(encoder.encode(payload))
  const key = await getKey(secret)
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64))
  return `${payloadB64}.${base64url(signature)}`
}

export async function verifySessionToken(
  token: string | undefined
): Promise<{ username: string } | null> {
  if (!token) return null
  const secret = process.env.SESSION_SECRET
  if (!secret) return null

  const [payloadB64, sigB64] = token.split(".")
  if (!payloadB64 || !sigB64) return null

  try {
    const key = await getKey(secret)
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(sigB64),
      encoder.encode(payloadB64)
    )
    if (!valid) return null

    const payload = JSON.parse(decoder.decode(base64urlToBytes(payloadB64)))
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null
    if (typeof payload.u !== "string") return null

    return { username: payload.u }
  } catch {
    return null
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_SECONDS
