import { NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://oapi.dingtalk.com"

// Mock data generator for demo purposes
function generateMockData(startDate: Date, endDate: Date) {
  const data = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
    const entriesCount = Math.floor(Math.random() * 5) + 2

    for (let i = 0; i < entriesCount; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1
      const date = new Date(current.getFullYear(), current.getMonth(), day)

      const netAmount = Math.floor(Math.random() * 50000000) + 1000000
      const ppn = Math.floor(netAmount * 0.11)
      const pph = Math.floor(netAmount * 0.02)
      const grossAmount = netAmount + ppn + pph

      data.push({
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `付款申请 - ${date.toISOString().split("T")[0]}`,
        createTime: date.toISOString(),
        finishTime: date.toISOString(),
        status: "COMPLETED",
        operator: ["张三", "李四", "王五", "赵六"][Math.floor(Math.random() * 4)],
        netAmount,
        grossAmount,
        ppn,
        pph,
      })
    }

    current.setMonth(current.getMonth() + 1)
  }

  return data.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
}

async function getAccessToken(appKey: string, appSecret: string) {
  const url = `${BASE_URL}/gettoken?appkey=${appKey}&appsecret=${appSecret}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.errcode !== 0) throw new Error(data.errmsg)
  return data.access_token
}

async function getInstanceIds(accessToken: string, processCode: string, startTime: number, endTime: number) {
  const url = `${BASE_URL}/topapi/processinstance/listids`
  const allIds: string[] = []
  let cursor = 0

  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        process_code: processCode,
        start_time: startTime,
        end_time: endTime,
        size: 20,
        cursor,
      }),
    })

    const data = await res.json()
    if (data.errcode !== 0) throw new Error(data.errmsg)

    const result = data.result || {}
    const ids = result.list || []
    allIds.push(...ids)

    if (result.next_cursor === undefined || result.next_cursor === null || ids.length === 0) break
    cursor = result.next_cursor
  }

  return allIds
}

async function getInstanceDetail(accessToken: string, instanceId: string) {
  const url = `${BASE_URL}/topapi/processinstance/get`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ process_instance_id: instanceId }),
  })

  const data = await res.json()
  if (data.errcode !== 0) throw new Error(data.errmsg)
  return data.result
}

function parseFormValues(formValues: any[]) {
  let netAmount = 0
  let grossAmount = 0
  let ppn = 0
  let pph = 0

  for (const field of formValues || []) {
    const name = field.name || ""
    const value = field.value || "0"

    try {
      const cleanValue = parseFloat(
        String(value).replace(/[^\d.-]/g, "")
      )

      if (name.includes("不含税") || name.toLowerCase().includes("net")) {
        netAmount = cleanValue || 0
      } else if (name.includes("含税") || name.toLowerCase().includes("gross") || name.toLowerCase().includes("total")) {
        grossAmount = cleanValue || 0
      } else if (name.includes("PPN") || name.toUpperCase().includes("VAT")) {
        ppn = cleanValue || 0
      } else if (name.includes("PPh") || name.toLowerCase().includes("withholding")) {
        pph = cleanValue || 0
      }
    } catch {
      // ignore parse errors
    }
  }

  return { netAmount, grossAmount, ppn, pph }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate } = body

    const useMock = process.env.USE_MOCK_DATA === "true"

    if (useMock) {
      const data = generateMockData(new Date(startDate), new Date(endDate))
      return NextResponse.json({ success: true, data, source: "mock" })
    }

    const appKey = process.env.DINGTALK_APP_KEY
    const appSecret = process.env.DINGTALK_APP_SECRET
    const processCode = process.env.DINGTALK_PROCESS_CODE

    if (!appKey || !appSecret || !processCode) {
      return NextResponse.json(
        { success: false, error: "Missing DingTalk credentials. Set USE_MOCK_DATA=true for demo." },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken(appKey, appSecret)
    const startTime = new Date(startDate).getTime()
    const endTime = new Date(endDate).getTime()

    const instanceIds = await getInstanceIds(accessToken, processCode, startTime, endTime)

    const results = []
    for (const id of instanceIds.slice(0, 100)) {
      const detail = await getInstanceDetail(accessToken, id)
      if (detail.status !== "COMPLETED") continue

      const amounts = parseFormValues(detail.form_component_values)

      results.push({
        id: detail.business_id || id,
        title: detail.title || "付款申请",
        createTime: detail.create_time,
        finishTime: detail.finish_time,
        status: detail.status,
        operator: detail.originator_userid,
        ...amounts,
      })
    }

    return NextResponse.json({ success: true, data: results, source: "dingtalk" })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
