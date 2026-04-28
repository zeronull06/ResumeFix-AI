# ResumeFix AI

AI-powered resume optimizer — analyzes your resume against a job description, gives an ATS score, identifies missing keywords, and generates an optimized version powered by OpenAI GPT-4o.

**Price:** $6.99 per analysis (one-time payment via Lemon Squeezy)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Express.js + tRPC 11 |
| Database | PostgreSQL (Supabase) via Drizzle ORM |
| AI | OpenAI GPT-4o |
| Payments | Lemon Squeezy (Merchant of Record — handles all global taxes) |
| Auth | Manus OAuth |
| Deployment | Vercel |

---

## User Flow

1. User uploads resume (PDF or paste text) + pastes Job Description
2. System saves a draft and redirects to Lemon Squeezy checkout ($6.99)
3. After payment, Lemon Squeezy sends `order_created` webhook
4. Frontend polls for payment confirmation, then triggers GPT-4o analysis
5. Results page shows: ATS Score, Score Breakdown, Missing Keywords, Improvement Suggestions, Optimized Resume

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
| `LEMONSQUEEZY_API_KEY` | app.lemonsqueezy.com/settings/api |
| `LEMONSQUEEZY_STORE_ID` | Lemon Squeezy Dashboard → Stores |
| `LEMONSQUEEZY_VARIANT_ID` | Lemon Squeezy → Products → Variants |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Set when creating webhook in Lemon Squeezy |

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

> **Note:** Vercel Pro plan recommended (60s function timeout) for GPT-4o analysis to complete reliably.

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
