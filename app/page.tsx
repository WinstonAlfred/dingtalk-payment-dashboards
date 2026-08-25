"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"
import {
  Download,
  RefreshCw,
  Filter,
  BarChart3,
  Table2,
  Activity,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatNumber } from "@/lib/utils"

interface PaymentRecord {
  id: string
  title: string
  createTime: string
  finishTime: string
  status: string
  operator: string
  netAmount: number
  grossAmount: number
  ppn: number
  pph: number
}

interface MonthlyData {
  month: string
  netAmount: number
  grossAmount: number
  ppn: number
  pph: number
  count: number
}

interface Totals {
  netAmount: number
  grossAmount: number
  ppn: number
  pph: number
  count: number
}

// Ledger palette — one accent hue per figure, no rainbow. Reused across
// the statement strip, sparklines, and every chart so the vocabulary stays
// consistent end to end.
const COLORS = {
  net: "#1F5A41",
  ppn: "#5B7A8C",
  pph: "#8A6D3B",
  gross: "#1B1F1C",
}

const PRESETS = [
  { label: "本月", days: 30 },
  { label: "上月", days: 60, offset: 30 },
  { label: "本季度", days: 90 },
  { label: "本年", days: 365 },
  { label: "全部", days: 365 * 2 },
]

const TABS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "charts", label: "Charts", icon: BarChart3 },
  { key: "table", label: "Table", icon: Table2 },
] as const

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function emptyTotals(): Totals {
  return { netAmount: 0, grossAmount: 0, ppn: 0, pph: 0, count: 0 }
}

function sumTotals(records: PaymentRecord[]): Totals {
  return records.reduce(
    (acc, r) => ({
      netAmount: acc.netAmount + r.netAmount,
      grossAmount: acc.grossAmount + r.grossAmount,
      ppn: acc.ppn + r.ppn,
      pph: acc.pph + r.pph,
      count: acc.count + 1,
    }),
    emptyTotals()
  )
}

function pctDelta(curr: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined || prev === 0) return null
  return ((curr - prev) / prev) * 100
}

export default function Dashboard() {
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>("mock")
  const [activeTab, setActiveTab] = useState<"overview" | "table" | "charts">("overview")
  const [activePreset, setActivePreset] = useState<string>("本月")
  const [prevTotals, setPrevTotals] = useState<Totals | null>(null)
  const [dateRange, setDateRange] = useState({
    start: getDateString(getStartOfMonth(new Date())),
    end: getDateString(getEndOfMonth(new Date())),
  })

  const fetchData = async (start: string, end: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/dingtalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setRecords(data.data)
      setSource(data.source)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetches the immediately preceding period of equal length, purely for
  // the delta shown under each statement figure. Fails silently — a
  // missing comparison just renders as "—" rather than blocking the page.
  const fetchPreviousTotals = async (start: string, end: string) => {
    const startD = new Date(start)
    const endD = new Date(end)
    const spanDays = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1
    const prevEnd = new Date(startD)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - spanDays + 1)
    try {
      const res = await fetch("/api/dingtalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: getDateString(prevStart),
          endDate: getDateString(prevEnd),
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPrevTotals(sumTotals(data.data as PaymentRecord[]))
    } catch {
      setPrevTotals(null)
    }
  }

  const loadPeriod = (start: string, end: string) => {
    fetchData(start, end)
    fetchPreviousTotals(start, end)
  }

  useEffect(() => {
    loadPeriod(dateRange.start, dateRange.end)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = useMemo(() => sumTotals(records), [records])

  const monthlyData: MonthlyData[] = useMemo(() => {
    const map = new Map<string, MonthlyData>()
    records.forEach((r) => {
      const d = new Date(r.createTime)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const existing = map.get(key)
      if (existing) {
        existing.netAmount += r.netAmount
        existing.grossAmount += r.grossAmount
        existing.ppn += r.ppn
        existing.pph += r.pph
        existing.count += 1
      } else {
        map.set(key, {
          month: key,
          netAmount: r.netAmount,
          grossAmount: r.grossAmount,
          ppn: r.ppn,
          pph: r.pph,
          count: 1,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
  }, [records])

  // Day-level buckets feed the small inline sparklines in the statement
  // strip — finer-grained than monthlyData so a single-month view (the
  // default) still shows real shape rather than one flat point.
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { net: number; ppn: number; pph: number; gross: number }>()
    records.forEach((r) => {
      const key = r.createTime.slice(0, 10)
      const existing = map.get(key)
      if (existing) {
        existing.net += r.netAmount
        existing.ppn += r.ppn
        existing.pph += r.pph
        existing.gross += r.grossAmount
      } else {
        map.set(key, { net: r.netAmount, ppn: r.ppn, pph: r.pph, gross: r.grossAmount })
      }
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))
  }, [records])

  // Turns the raw totals into sentences a controller could actually act
  // on: composition, the single largest line item, and how fast approvals
  // are moving. This is what closes the "just numbers" gap.
  const insights = useMemo(() => {
    if (records.length === 0) return null
    const withFinish = records.filter((r) => r.finishTime)
    const avgApprovalDays =
      withFinish.length > 0
        ? withFinish.reduce(
            (sum, r) => sum + (new Date(r.finishTime).getTime() - new Date(r.createTime).getTime()) / 86400000,
            0
          ) / withFinish.length
        : null
    const largest = records.reduce(
      (max, r) => (max === null || r.grossAmount > max.grossAmount ? r : max),
      null as PaymentRecord | null
    )
    const ppnShare = totals.grossAmount > 0 ? (totals.ppn / totals.grossAmount) * 100 : 0
    const pphShare = totals.grossAmount > 0 ? (totals.pph / totals.grossAmount) * 100 : 0
    const completedCount = records.filter((r) => r.status === "COMPLETED").length
    return { avgApprovalDays, largest, ppnShare, pphShare, completedCount, total: records.length }
  }, [records, totals])

  const metricConfig = [
    {
      id: "net",
      label: "不含税金额",
      labelEn: "Net amount",
      value: totals.netAmount,
      prev: prevTotals?.netAmount,
      trend: dailyTrend.map((d) => d.net),
      color: COLORS.net,
    },
    {
      id: "ppn",
      label: "PPN",
      labelEn: "Value added tax",
      value: totals.ppn,
      prev: prevTotals?.ppn,
      trend: dailyTrend.map((d) => d.ppn),
      color: COLORS.ppn,
    },
    {
      id: "pph",
      label: "PPh",
      labelEn: "Withholding tax",
      value: totals.pph,
      prev: prevTotals?.pph,
      trend: dailyTrend.map((d) => d.pph),
      color: COLORS.pph,
    },
    {
      id: "gross",
      label: "含税金额",
      labelEn: "Gross amount",
      value: totals.grossAmount,
      prev: prevTotals?.grossAmount,
      trend: dailyTrend.map((d) => d.gross),
      color: COLORS.gross,
    },
  ]

  const handlePreset = (preset: (typeof PRESETS)[0]) => {
    const end = new Date()
    const start = new Date()
    if (preset.offset) {
      start.setDate(start.getDate() - preset.offset - preset.days)
      end.setDate(end.getDate() - preset.offset)
    } else {
      start.setDate(start.getDate() - preset.days)
    }
    const newRange = { start: getDateString(start), end: getDateString(end) }
    setDateRange(newRange)
    setActivePreset(preset.label)
    loadPeriod(newRange.start, newRange.end)
  }

  const handleCustomDate = () => {
    setActivePreset("")
    loadPeriod(dateRange.start, dateRange.end)
  }

  const exportCSV = () => {
    const headers = ["ID", "Title", "Create Time", "Operator", "Net Amount", "PPN", "PPh", "Gross Amount"]
    const rows = records.map((r) => [
      r.id,
      r.title,
      r.createTime,
      r.operator,
      r.netAmount,
      r.ppn,
      r.pph,
      r.grossAmount,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payment-records-${dateRange.start}-to-${dateRange.end}.csv`
    a.click()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-sm border border-border bg-card px-3 py-2 shadow-sm">
          <p className="font-data text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-1 space-y-0.5">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="font-data text-xs tabular-nums" style={{ color: entry.color }}>
                {entry.name} · {formatCurrency(entry.value)}
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Masthead */}
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="font-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Payment Approvals · DingTalk
              </p>
              <h1 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
                付款申请单仪表盘
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-data text-xs text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: source === "dingtalk" ? COLORS.net : COLORS.pph }}
                />
                {source === "dingtalk" ? "Live · DingTalk" : "Mock data"}
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={records.length === 0}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Period control */}
      <div className="border-b border-border bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={`rounded px-2.5 py-1 font-data text-xs transition-colors ${
                  activePreset === preset.label
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setActivePreset("")
                setDateRange((p) => ({ ...p, start: e.target.value }))
              }}
              className="h-8 rounded border border-border bg-card px-2 font-data text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <span className="pb-1.5 text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setActivePreset("")
                setDateRange((p) => ({ ...p, end: e.target.value }))
              }}
              className="h-8 rounded border border-border bg-card px-2 font-data text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <Button size="sm" onClick={handleCustomDate} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading" : "Apply"}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-6xl px-6 pt-4 sm:px-8">
          <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 px-4 py-3 font-data text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Statement summary — the signature element: not just totals, but
          how each figure moved against the prior period, plus shape. */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
            {metricConfig.map((m) => (
              <StatementFigure key={m.id} {...m} loading={loading} />
            ))}
          </div>
        </div>
      </section>

      {/* Insight strip — the plain-language read of the same numbers */}
      {insights && !loading && (
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-6 py-3 sm:px-8">
            <div className="flex flex-wrap gap-x-8 gap-y-1.5 font-data text-xs text-muted-foreground">
              <span>
                PPN is <span className="text-foreground">{insights.ppnShare.toFixed(1)}%</span> of gross this period
              </span>
              <span>
                PPh withheld: <span className="text-foreground">{insights.pphShare.toFixed(1)}%</span> of gross
              </span>
              {insights.avgApprovalDays !== null && (
                <span>
                  Avg approval time: <span className="text-foreground">{insights.avgApprovalDays.toFixed(1)} days</span>
                </span>
              )}
              {insights.largest && (
                <span className="truncate">
                  Largest payment: <span className="text-foreground">{formatCurrency(insights.largest.grossAmount)}</span> —{" "}
                  {insights.largest.title}
                </span>
              )}
              <span>
                <span className="text-foreground">
                  {insights.completedCount}/{insights.total}
                </span>{" "}
                completed
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Section tabs */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl gap-6 px-6 sm:px-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 py-3 font-data text-xs uppercase tracking-wide transition-colors ${
                activeTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {activeTab === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <Card className="shadow-none">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base">Monthly breakdown</CardTitle>
                <CardDescription>不含税金额, PPN, and PPh by month</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : monthlyData.length === 0 ? (
                  <EmptyState message="No entries for this period." />
                ) : (
                  <>
                    <ChartLegend
                      items={[
                        { label: "不含税金额", color: COLORS.net },
                        { label: "PPN", color: COLORS.ppn },
                        { label: "PPh", color: COLORS.pph },
                      ]}
                    />
                    <div className="mt-4 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis
                            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                          <Bar dataKey="netAmount" name="不含税金额" fill={COLORS.net} radius={[2, 2, 0, 0]} />
                          <Bar dataKey="ppn" name="PPN" fill={COLORS.ppn} radius={[2, 2, 0, 0]} />
                          <Bar dataKey="pph" name="PPh" fill={COLORS.pph} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-none">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base">Composition</CardTitle>
                  <CardDescription>Share of gross amount, this period</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : totals.grossAmount === 0 ? (
                    <EmptyState message="No data available" />
                  ) : (
                    <CompositionBar totals={totals} />
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base">含税金额 trend</CardTitle>
                  <CardDescription>Gross amount over time</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : monthlyData.length === 0 ? (
                    <EmptyState message="No data available" />
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.gross} stopOpacity={0.15} />
                              <stop offset="95%" stopColor={COLORS.gross} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis
                            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="grossAmount"
                            name="含税金额"
                            stroke={COLORS.gross}
                            strokeWidth={1.5}
                            fill="url(#grossGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Charts Tab */}
        {activeTab === "charts" && (
          <Card className="shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">Detailed monthly comparison</CardTitle>
              <CardDescription>All four figures, side by side</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : monthlyData.length === 0 ? (
                <EmptyState message="No data available for the selected period" />
              ) : (
                <>
                  <ChartLegend
                    items={[
                      { label: "不含税金额", color: COLORS.net },
                      { label: "PPN", color: COLORS.ppn },
                      { label: "PPh", color: COLORS.pph },
                      { label: "含税金额", color: COLORS.gross },
                    ]}
                  />
                  <div className="mt-4 h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                        <Bar dataKey="netAmount" name="不含税金额" fill={COLORS.net} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="ppn" name="PPN" fill={COLORS.ppn} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="pph" name="PPh" fill={COLORS.pph} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="grossAmount" name="含税金额" fill={COLORS.gross} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table Tab */}
        {activeTab === "table" && (
          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-base">Approval records</CardTitle>
                <CardDescription>{formatNumber(records.length)} entries</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : records.length === 0 ? (
                <EmptyState message="No records found for the selected period" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          Date
                        </TableHead>
                        <TableHead className="font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          Title
                        </TableHead>
                        <TableHead className="font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          Operator
                        </TableHead>
                        <TableHead className="text-right font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          不含税金额
                        </TableHead>
                        <TableHead className="text-right font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          PPN
                        </TableHead>
                        <TableHead className="text-right font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          PPh
                        </TableHead>
                        <TableHead className="text-right font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          含税金额
                        </TableHead>
                        <TableHead className="text-center font-data text-[11px] uppercase tracking-wide text-muted-foreground">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id} className="border-border hover:bg-muted/40">
                          <TableCell className="whitespace-nowrap font-data text-xs text-muted-foreground">
                            {new Date(record.createTime).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate font-medium text-foreground">
                            {record.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{record.operator}</TableCell>
                          <TableCell className="text-right font-data text-xs tabular-nums" style={{ color: COLORS.net }}>
                            {formatCurrency(record.netAmount)}
                          </TableCell>
                          <TableCell className="text-right font-data text-xs tabular-nums" style={{ color: COLORS.ppn }}>
                            {formatCurrency(record.ppn)}
                          </TableCell>
                          <TableCell className="text-right font-data text-xs tabular-nums" style={{ color: COLORS.pph }}>
                            {formatCurrency(record.pph)}
                          </TableCell>
                          <TableCell className="text-right font-data text-xs font-medium tabular-nums text-foreground">
                            {formatCurrency(record.grossAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusDot status={record.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center font-data text-[11px] uppercase tracking-wide text-muted-foreground">
        Payment Approval Dashboard · Synced with DingTalk
      </footer>
    </div>
  )
}

/* ─── Sub-Components ─── */

function StatementFigure({
  label,
  labelEn,
  value,
  prev,
  trend,
  color,
  loading,
}: {
  label: string
  labelEn: string
  value: number
  prev: number | null | undefined
  trend: number[]
  color: string
  loading: boolean
}) {
  const delta = pctDelta(value, prev)
  return (
    <div className="px-5 py-6 sm:px-6">
      <p className="font-data text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="font-data text-[10px] text-muted-foreground/70">{labelEn}</p>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-32" />
      ) : (
        <p className="mt-2 font-display text-[26px] font-medium tabular-nums text-foreground">
          {formatCurrency(value)}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {!loading && delta !== null ? (
          <span
            className="flex items-center gap-0.5 font-data text-xs tabular-nums"
            style={{ color: delta >= 0 ? COLORS.net : "hsl(var(--destructive))" }}
          >
            {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : (
          <span className="font-data text-xs text-muted-foreground">—</span>
        )}
        <span className="font-data text-[11px] text-muted-foreground">vs prior period</span>
      </div>
      <div className="mt-3 h-8 w-full">
        {!loading && trend.length > 1 && <Sparkline data={trend} color={color} />}
      </div>
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CompositionBar({ totals }: { totals: Totals }) {
  const { netAmount, ppn, pph, grossAmount } = totals
  const netPct = (netAmount / grossAmount) * 100
  const ppnPct = (ppn / grossAmount) * 100
  const pphPct = (pph / grossAmount) * 100
  const rows = [
    { label: "不含税金额 · Net", pct: netPct, value: netAmount, color: COLORS.net },
    { label: "PPN", pct: ppnPct, value: ppn, color: COLORS.ppn },
    { label: "PPh", pct: pphPct, value: pph, color: COLORS.pph },
  ]
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-sm border border-border">
        {rows.map((r) => (
          <div key={r.label} style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between font-data text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: r.color }} />
              {r.label}
            </span>
            <span className="tabular-nums text-foreground">
              {formatCurrency(r.value)} <span className="text-muted-foreground">({r.pct.toFixed(1)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 font-data text-[11px] text-muted-foreground">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const isCompleted = status === "COMPLETED"
  return (
    <span className="inline-flex items-center gap-1.5 font-data text-xs text-muted-foreground">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: isCompleted ? COLORS.net : COLORS.pph }}
      />
      {isCompleted ? "Completed" : status}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Filter className="h-6 w-6 text-muted-foreground/50" />
      <p className="font-data text-xs text-muted-foreground">{message}</p>
    </div>
  )
}