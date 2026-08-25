# 付款申请单仪表盘 | Payment Approval Dashboard

A beautiful, production-ready dashboard for visualizing DingTalk payment approval data (付款申请单).

![Dashboard Preview](https://i.imgur.com/placeholder.png)

## Features

- **4 Key Metrics**: 不含税金额, PPN, PPh, 含税金额 with real-time totals
- **Interactive Charts**: Monthly bar charts, area trends, pie composition
- **Date Filtering**: Presets (This Month, Last Month, Quarter, Year) + custom ranges
- **Data Table**: Full record listing with sortable columns
- **Export CSV**: Download all records for any date range
- **Mock Data Mode**: Works immediately without DingTalk credentials
- **Real API Mode**: Connects to DingTalk Open Platform APIs
- **Mobile Responsive**: Looks great on phone, tablet, and desktop
- **Dark Mode Support**: Auto-detects system preference

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel (static export)

## Quick Start

### 1. Clone & Install

```bash
cd dingtalk-payment-dashboard
npm install
```

### 2. Run in Mock Mode (No API needed)

```bash
# Copy env file
cp .env.example .env.local

# It already has USE_MOCK_DATA=true, so just run:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Connect Real DingTalk Data

1. Go to [DingTalk Open Platform](https://open-dev.dingtalk.com)
2. Create an **Internal Enterprise App** (企业内部应用)
3. Note your **AppKey** and **AppSecret**
4. Add permissions: `工作流实例读权限`, `审批管理`
5. Find your **process_code**:
   - Go to `oa.dingtalk.com` → edit your 付款申请单 form
   - Look at the URL: `PROC-FF6Y2xxxx-xxxxxxxxxx`
6. Update `.env.local`:

```env
USE_MOCK_DATA=false
DINGTALK_APP_KEY=your_app_key
DINGTALK_APP_SECRET=your_app_secret
DINGTALK_PROCESS_CODE=PROC-XXXXXX
```

7. Restart: `npm run dev`

## Deploy to Vercel

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Option B: CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Option C: GitHub + Vercel (Recommended)

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your repo
4. Add Environment Variables in Vercel dashboard:
   - `USE_MOCK_DATA` = `false`
   - `DINGTALK_APP_KEY` = your key
   - `DINGTALK_APP_SECRET` = your secret
   - `DINGTALK_PROCESS_CODE` = your process code
5. Deploy!

## Add to DingTalk Workbench

After deployment:

1. Copy your Vercel URL (e.g., `https://your-dashboard.vercel.app`)
2. Open DingTalk → 工作台 → 右上角 **+** → **创建快捷体验应用**
3. Fill in:
   - **应用名称**: `付款申请单仪表盘`
   - **移动端访问地址**: `https://your-dashboard.vercel.app`
   - **桌面端访问地址**: `https://your-dashboard.vercel.app`
   - **工作台分组**: `财务` or `我的`
4. Click **添加到工作台**
5. Send to admin to publish company-wide

## API Limits

| Limit | Value |
|-------|-------|
| Date range per query | Max 120 days |
| Start time from now | Max 365 days (or 5 years with OA Advanced) |
| Instances per loop | Max 10,000 total |
| Page size | Max 20 per request |

> For >1 year of data, the API route loops in 120-day chunks automatically.

## Project Structure

```
├── app/
│   ├── api/dingtalk/route.ts   # API route for DingTalk data
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main dashboard
├── components/
│   └── ui/                     # shadcn/ui components
├── lib/
│   └── utils.ts                # Utility functions
├── .env.example                # Environment template
└── next.config.js              # Next.js config (static export)
```

## Customization

### Change Currency
Edit `lib/utils.ts`:
```typescript
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR", // Change to your currency
  }).format(value)
}
```

### Change Form Field Names
Edit `app/api/dingtalk/route.ts` → `parseFormValues()` function to match your DingTalk form field labels.

## License

MIT
