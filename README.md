# ContentFlow AI

An AI-powered digital content creation platform built with Next.js, Supabase, and OpenAI.

## Features Implemented

| Feature | Status |
|---|---|
| Authentication (Supabase Auth) | ✅ Complete |
| Content Studio (generate, rewrite, summarize, repurpose) | ✅ Complete |
| Campaign DNA (multi-platform coordinated content) | ✅ Complete |
| Content Critic (AI review panel) | ✅ Complete |
| Brand Memory (profiles with tone, vocab, examples) | ✅ Complete |
| Campaigns management (list, detail, status) | ✅ Complete |
| Content Calendar (scheduled assets view) | ✅ Complete |
| Media Library (upload, tags, AI descriptions) | ✅ Complete |
| Settings & setup guide | ✅ Complete |
| Row Level Security (RLS) | ✅ Complete |
| Zod validation on all routes | ✅ Complete |
| Rate limiting (per-user) | ✅ Complete |
| Security headers (CSP, X-Frame, etc.) | ✅ Complete |
| Magic-byte MIME validation | ✅ Complete |
| Private storage with signed URLs | ✅ Complete |
| Unit & security tests (Vitest) | ✅ 28 passing |

## Tech Stack

- **Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js Route Handlers
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **AI**: OpenAI-compatible API (gpt-4o-mini by default)
- **Validation**: Zod
- **Tests**: Vitest

---

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An OpenAI API key (or compatible provider)

### 2. Clone and Install

```bash
git clone <repo-url>
cd contentflow-ai
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

**Never commit `.env.local` to version control.**

### 4. Supabase Configuration

#### 4a. Run the Database Migration

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`.
4. Paste and run it.

This creates all tables, RLS policies, indexes, and triggers.

#### 4b. Create the Media Storage Bucket

1. Go to **Storage** in the Supabase dashboard.
2. Click **New bucket**.
3. Name it `media`.
4. Set it to **Private** (not public).
5. After creating it, go to **SQL Editor** and run the storage policies from the comments at the bottom of the migration file:

```sql
CREATE POLICY media_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY media_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY media_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### 4c. Authentication Setup

1. Go to **Authentication → Settings**.
2. Set **Site URL** to `http://localhost:3000` (or your production URL).
3. Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Enable **Email** auth provider if not already enabled.
5. Optionally disable email confirmation for development: **Authentication → Email Templates → Confirm signup → Disable**.

### 5. AI Provider Configuration

ContentFlow AI uses an OpenAI-compatible API. Options:

| Provider | Configuration |
|---|---|
| OpenAI | `OPENAI_API_KEY=sk-...` |
| Azure OpenAI | `OPENAI_API_KEY=...` + `OPENAI_BASE_URL=https://your-resource.openai.azure.com` |
| Groq | `OPENAI_API_KEY=...` + `OPENAI_BASE_URL=https://api.groq.com/openai/v1` |
| Ollama (local) | `OPENAI_API_KEY=ollama` + `OPENAI_BASE_URL=http://localhost:11434/v1` + `AI_MODEL=llama3.2` |

To change the model: `AI_MODEL=gpt-4o` (default: `gpt-4o-mini`).

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page.

---

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript type check (no emit)
npm run test         # Run Vitest tests
npm run test:watch   # Watch mode for tests
```

---

## Testing

```bash
npm run test
```

**28 tests** across 3 suites:

- `src/tests/rate-limit.test.ts` — Rate limiter unit tests
- `src/tests/validation.test.ts` — Zod schema validation tests  
- `src/tests/security.test.ts` — Security boundary and MIME type tests

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes (protected by layout)
│   │   ├── dashboard/      # Overview dashboard
│   │   ├── studio/         # Content Studio
│   │   ├── campaigns/      # Campaign list, detail, new
│   │   ├── brand/          # Brand Memory
│   │   ├── calendar/       # Content Calendar
│   │   ├── media/          # Media Library
│   │   └── settings/       # Settings & setup guide
│   ├── api/                # Route Handlers (server-side)
│   │   ├── generate/       # AI content generation
│   │   ├── campaigns/      # Campaign CRUD
│   │   ├── critic/         # AI content review
│   │   ├── brand/          # Brand profile CRUD
│   │   ├── assets/         # Content asset CRUD
│   │   └── media/          # Media upload & management
│   └── auth/               # Login, signup, callback
├── components/
│   ├── layout/             # Sidebar, TopBar
│   ├── studio/             # ContentCard, CriticPanel
│   └── ui/                 # Button, Input, Card, Toast, Badge, Spinner
├── lib/
│   ├── ai/service.ts       # Server-side AI service (OpenAI)
│   ├── supabase/           # Client, server, types
│   ├── rate-limit.ts       # In-memory rate limiter
│   ├── api-helpers.ts      # Auth, rate-limit, error helpers
│   └── utils.ts            # Utilities and constants
└── tests/                  # Vitest test suites
supabase/
└── migrations/
    └── 001_initial_schema.sql   # Full DB schema with RLS
```

---

## Security Notes

- **AI keys** are server-side only — never sent to the browser.
- **Every API route** verifies the user is authenticated via Supabase before any DB operation.
- **RLS policies** on every table ensure users can only access their own data.
- **File uploads** use magic-byte MIME validation (not just file extension).
- **Media files** are in a private bucket; access uses short-lived signed URLs.
- **Zod** validates all API request bodies before processing.
- **Rate limiting**: 20 AI requests/user/minute (in-process — see limitations below).
- **Security headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.

---

## Known Limitations

### Rate Limiting
The in-process rate limiter works correctly for a single server instance. In **multi-instance or serverless deployments** (e.g., Vercel), each instance maintains a separate counter, so the effective limit is `20 × number_of_instances`. For production, replace `src/lib/rate-limit.ts` with a Redis-backed limiter (e.g., [Upstash Rate Limit](https://github.com/upstash/ratelimit)).

### Media Library
Images are stored with metadata but not rendered as thumbnails in this MVP (the browser cannot display them directly from private storage without a signed URL fetch). Signed URLs are fetched on demand in the detail panel.

### Content Calendar
The calendar displays drafts with a `scheduled_at` timestamp from the database. **No external publishing occurs.** The schedule is metadata only.

### Real Social Publishing
The Campaign DNA generates content and saves it. Publishing to actual social networks requires platform API integrations (OAuth tokens, posting endpoints) which are not implemented in the MVP.

### AI Vision for Image Descriptions
AI image descriptions (Media Library) require a vision-capable model (e.g., `gpt-4o`). With `gpt-4o-mini`, this will fail gracefully — the upload still succeeds without a description.

---

## Deployment (Vercel)

1. Connect your GitHub repo to Vercel.
2. Set all environment variables in the Vercel dashboard.
3. Update `NEXT_PUBLIC_APP_URL` to your production URL.
4. Update Supabase Auth redirect URLs to include your production domain.
5. Deploy. The database migrations must be run manually (see step 4a).

For the rate limiter in production, use [Upstash Redis](https://upstash.com) and replace the rate-limit module.
