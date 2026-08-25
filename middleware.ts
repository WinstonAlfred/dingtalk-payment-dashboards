import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get("session")?.value)

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Everything requires a session except the login page itself and the
// login API route it submits to. Static assets are excluded so the app
// shell and Next's own internals aren't blocked.
export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
}
