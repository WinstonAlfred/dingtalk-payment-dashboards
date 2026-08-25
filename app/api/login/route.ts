import { NextRequest, NextResponse } from "next/server"
import { isValidAdmin } from "@/lib/admins"
import { createSessionToken, SESSION_COOKIE_MAX_AGE } from "@/lib/auth"

// Coarse per-IP throttle so a shared, memorable password isn't trivially
// brute-forceable from the public internet. Resets on cold start and isn't
// shared across serverless instances — a deterrent, not a guarantee. If
// you need a hard guarantee, move this to Vercel KV or similar.
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 10 * 60 * 1000

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_ATTEMPTS
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    )
  }

  try {
    const { username, password } = await request.json()
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 })
    }

    const normalizedUsername = username.trim().toLowerCase()
    if (!isValidAdmin(normalizedUsername, password)) {
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 })
    }

    const token = await createSessionToken(normalizedUsername)
    const response = NextResponse.json({ success: true })
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    })
    return response
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 })
  }
}