"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || "Invalid username or password")
        setLoading(false)
        return
      }
      const from = searchParams.get("from")
      router.push(from && from !== "/login" ? from : "/")
      router.refresh()
    } catch {
      setError("Something went wrong. Try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Payment Approvals · DingTalk
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-foreground">
            付款申请单仪表盘
          </h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-data text-xs uppercase tracking-wide text-muted-foreground">Sign in</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block font-data text-xs text-muted-foreground">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="h-10 w-full rounded border border-border bg-background px-3 font-data text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                placeholder="admin1"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block font-data text-xs text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 w-full rounded border border-border bg-background px-3 font-data text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 font-data text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center font-data text-[11px] text-muted-foreground">
          Restricted access · Authorized personnel only
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}