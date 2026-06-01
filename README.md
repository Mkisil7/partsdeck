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

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy the example and fill in your keys:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
   | `ANTHROPIC_API_KEY` | Anthropic API key for parsing |
   | `RESEND_API_KEY` | Resend API key for email |
   | `WAREHOUSE_EMAIL_DEFAULT` | Fallback warehouse email |
   | `RESEND_FROM_EMAIL` | _(optional)_ verified Resend sender |

3. **Apply the database migration** — run the SQL in
   `supabase/migrations/0001_init.sql` against your project (Supabase SQL editor,
   `supabase db push`, or the MCP `apply_migration` tool). It creates the
   `jobs`, `parts`, `transfer_requests`, and `user_settings` tables with RLS
   policies and a public `job-images` storage bucket.

4. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — you'll be routed to `/login`. Create an account,
   then you land on the dashboard.

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
  **Send to Warehouse** (Resend email + marks job transferred).
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
