# ResumeFix AI

AI-powered resume optimizer — analyzes your resume against a job description, gives an ATS score, identifies missing keywords, and generates a fully rewritten optimized resume ready to download as PDF.

> **Current mode:** Payment disabled for testing. Upload resume + JD → get full results instantly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Express.js + tRPC 11 |
| Database | PostgreSQL (Supabase) via Drizzle ORM |
| AI | OpenAI GPT-4o-mini |
| Payments | Lemon Squeezy (Merchant of Record — disabled for testing) |
| Auth | Manus OAuth |
| Deployment | Vercel |

---

## User Flow

1. User uploads resume (PDF or paste text) + pastes Job Description
2. GPT-4o-mini analyzes resume vs JD (15–25 seconds)
3. Results page shows: ATS Score, Score Breakdown, Missing Keywords, Improvement Suggestions, Optimized Resume
4. User can **Download PDF** or **Copy Markdown** of the optimized resume

> To re-enable payment: see the Lemon Squeezy section below.

---

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/zeronull06/ResumeFix-AI.git
cd ResumeFix-AI
pnpm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in all values.

Required variables:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection string (Transaction pooler, port 6543) |
| `JWT_SECRET` | Any random string, min 32 chars |
| `OPENAI_API_KEY` | platform.openai.com/api-keys |
| `LEMONSQUEEZY_API_KEY` | (optional) app.lemonsqueezy.com/settings/api |
| `LEMONSQUEEZY_STORE_ID` | (optional) Lemon Squeezy Dashboard → Stores |
| `LEMONSQUEEZY_VARIANT_ID` | (optional) Lemon Squeezy → Products → Variants |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | (optional) Set when creating webhook in Lemon Squeezy |

### 3. Database Migration

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Or copy SQL from `drizzle/migrations/` and run in Supabase SQL Editor.

### 4. Lemon Squeezy Webhook

After deploying to Vercel, add a webhook in Lemon Squeezy:

- **Callback URL:** `https://your-domain.vercel.app/api/lemonsqueezy/webhook`
- **Events:** tick `order_created` only
- **Signing secret:** same value as `LEMONSQUEEZY_WEBHOOK_SECRET`

### 5. Run Locally

```bash
pnpm dev
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import project in vercel.com
3. Add all environment variables in Vercel → Settings → Environment Variables
4. Deploy

> **Note:** GPT-4o-mini typically responds in 8–12 seconds. Vercel Hobby (10s timeout) may occasionally timeout on complex resumes. Vercel Pro (60s) is recommended for production.

---

## Project Structure

```
client/          React frontend (Vite)
server/          Express backend
  routers/       tRPC procedures
  webhooks/      Lemon Squeezy webhook handler
  _core/         Auth, context, LLM helpers
drizzle/         PostgreSQL schema and migrations
api/             Vercel serverless entry point
```

---

## License

MIT
