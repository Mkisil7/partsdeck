# PartsDeck

A mobile-first PWA for tracking truck parts inventory and sending warehouse
transfer requests. Snap a photo of a job sheet, speak it, or type it in —
PartsDeck parses it into structured parts data and lets you email a clean
parts request to your warehouse.

## Tech stack

- **Next.js 14** (App Router, TypeScript, strict mode)
- **Supabase** — Postgres + Row Level Security, Auth (email/password), Storage
- **Anthropic** (`claude-sonnet-4-6`) — job-sheet OCR + speech parsing
- **Resend** — transactional transfer emails
- **Tailwind CSS** — dark navy (`#0a0f1e`) / gold (`#f0a500`) theme
- **PWA** — installable, offline read caching via service worker

## Getting started

### 1. Environment variables

`.env.local.example` is in git as a **template**. You need to create your own `.env.local` file locally (it's in `.gitignore` so it won't be committed — this keeps secrets out of the repo).

**Create `.env.local`:**

```bash
cp .env.local.example .env.local
```

Then fill in each variable:

| Variable | Get it from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → `service_role` key |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API keys |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API keys (sends the transfer email) |
| `RESEND_FROM_EMAIL` | _(optional)_ a verified Resend sender; defaults to `onboarding@resend.dev` |
| `WAREHOUSE_EMAIL_DEFAULT` | Your warehouse email (pre-fills the transfer form) |

**Why `.env.local` is local-only:** This file contains API keys and secrets. It's in `.gitignore` so it never gets committed. Only `.env.local.example` (with no real secrets) is in git.

### 2. Install & migrate

```bash
npm install
```

Apply the Supabase migration to create the database schema:

- **Via Supabase dashboard:** Go to SQL editor, paste the contents of `supabase/migrations/0001_init.sql`, and run it.
- **Or via CLI:** `supabase db push` (if you have Supabase CLI set up locally).

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000. You'll be routed to `/login` — create an account and start using the app.

## Features

- **Job intake** (3 methods → one review screen)
  - **Photo** — camera capture, uploaded to Supabase Storage and parsed by the
    Anthropic Vision API.
  - **Speech** — Web Speech API transcription, parsed by Anthropic.
  - **Manual** — full form with dynamic part rows.
  - Each part has both a **name** and a **SKU/part #**; the parser figures out
    which is which even when only one is written on the sheet.
- **Dashboard** — open/transferred/pending stat cards, recent jobs with color
  status badges, search (job #, customer, part) and date-range filtering.
- **Job detail** — edit part quantities inline, change status, and
  **Send to Warehouse** (emails the parts list via Resend + marks job transferred).
- **Inventory** — aggregate of parts across open jobs, grouped by category,
  with totals and a highlight for parts ordered on 3+ jobs.
- **Settings** — default warehouse email, technician name, truck ID (pre-fill
  new jobs).

## Project structure

```
app/            routes (dashboard, jobs/new, jobs/[id], inventory, settings, api/*)
components/     ui / jobs / dashboard / settings components
lib/            supabase clients, anthropic + resend helpers, types, queries
supabase/       SQL migration
public/         PWA manifest, service worker, icons
```

API route handlers stay thin — parsing/email logic lives in `lib/`.

## Deploy (Vercel)

Push to GitHub, import the repo in Vercel, add the environment variables above,
and deploy. The PWA manifest and service worker are served from `public/`.
