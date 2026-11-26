# Confession Wall

An anonymous, real-time **Confession Wall** built with **Next.js 14 (App Router + TypeScript + Tailwind CSS)**, **Supabase** (with an automatic zero-config local JSON fallback), and **NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b`)** for AI content moderation and empathetic/witty AI reactions.

## Features

- **Anonymous Posting & Categories**: Post anonymously with optional category tags (`#Confession`, `#Secret`, `#Love`, `#Work`, `#School`, `#Funny`, `#Vent`, `#Regret`). Raw IP addresses are never stored—client IPs are SHA-256 hashed with a server-side salt.
- **NVIDIA Nemotron AI Moderation**: Every confession is evaluated by `nvidia/nemotron-3-ultra-550b-a55b` (`chat_template_kwargs: { enable_thinking: true }`) for hate speech, doxxing/PII, harassment, threats, and spam:
  - **Safe** → `approved` + generates an AI reaction + publishes to the wall.
  - **Borderline / Ambiguous** → `flagged` → queued for human review in `/admin`.
  - **Guideline Violation** → `rejected` (HTTP `422`) → preserves your draft in the form and shows the moderation reason so you can revise.
- **NVIDIA Nemotron AI Companion**: Approved confessions receive a custom AI emoji and 1–2 sentence reaction rendered in an AI bubble beneath the post.
- **Toggleable Emoji Reactions**: React with `❤️`, `😂`, `😢`, or `😮`. Browser state persists in `localStorage`, and counts update atomically via PostgreSQL `adjust_reaction` RPC (or the local store).
- **Search, Filter, Sort & Discovery**: Debounced keyword search, category filter chips, `Newest` / `Top` sorting, `Load More` pagination, permalink sharing, community reporting, and a **Surprise Me** random confession button.
- **Dual-Mode Persistence**:
  - **Local Mode (Zero-Config)**: When Supabase variables are unset or placeholders, data is automatically stored in `.data/confessions.json` (gitignored and seeded with starter posts), so every feature works immediately on `npm run dev`.
  - **Supabase Live Mode**: Configure real Supabase keys and run `supabase/schema.sql` to enable PostgreSQL persistence, Row Level Security (RLS), and Supabase Realtime subscriptions.
- **Admin Moderation Dashboard (`/admin`)**: Protected by an HMAC-SHA256 signed HTTP-only cookie, featuring live queue counts (`Flagged`, `Pending`, `Approved`, `Rejected`), keyword search, user-report badges, moderation notes, `Regenerate AI`, `Approve`, `Reject`, and `Delete`.

---

## Project Structure

```text
confession-wall/
├── .env.example
├── .env.local                  # Local secrets (gitignored)
├── .gitignore
├── package.json
├── vitest.config.ts
├── supabase/
│   └── schema.sql              # Tables, indexes, RLS, Realtime, adjust_reaction RPC
├── tests/
│   ├── auth-and-validators.test.ts
│   ├── nvidia.test.ts
│   └── store-and-routes.test.ts
└── src/
    ├── app/
    │   ├── page.tsx            # Main confession wall (form, search/filter, feed)
    │   ├── confession/[id]/    # Single confession permalink + random navigation
    │   ├── admin/              # Moderation dashboard & /admin/login
    │   └── api/
    │       ├── health/         # Storage, Realtime & NVIDIA AI status
    │       ├── confessions/    # GET, POST, random, [id], [id]/react, [id]/report
    │       ├── ai/             # Standalone rate-limited moderate & react endpoints
    │       └── admin/          # login (POST/DELETE) & moderate (GET/PATCH)
    ├── components/             # Navbar, Footer, ConfessionForm, ConfessionCard, ReactionBar, AIReaction, UI primitives
    ├── hooks/                  # useConfessions, useRealtime
    ├── lib/                    # nvidia.ts, prompts.ts, store.ts, adminAuth.ts, rateLimit.ts, hash.ts, validators.ts, supabase/
    └── types/                  # Shared TypeScript interfaces & enums
```

---

## Getting Started

### 1. Install Dependencies

```bash
cd confession-wall
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NVIDIA_API_KEY` | Yes (for live AI) | NVIDIA NIM API key from [build.nvidia.com](https://build.nvidia.com) |
| `NVIDIA_MODEL` | Optional | Defaults to `nvidia/nemotron-3-ultra-550b-a55b` |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL (leave placeholder for Local Mode) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon key (leave placeholder for Local Mode) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role key (leave placeholder for Local Mode) |
| `ADMIN_PASSWORD` | Yes (for `/admin`) | Password for `/admin/login` |
| `ADMIN_SESSION_SECRET` | Yes (for `/admin`) | Random 32+ char secret for signing admin session cookies |
| `IP_HASH_SALT` | Yes | Random salt used for SHA-256 IP hashing |

### 3. (Optional) Initialize Supabase

To switch from **Local Mode** to **Supabase Live Mode**:
1. Run `supabase/schema.sql` in your Supabase SQL Editor.
2. Replace the Supabase placeholders in `.env.local` with your project URL, anon key, and service role key.

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login) to access the moderation dashboard.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint (`next/core-web-vitals`) |
| `npm test` | Run Vitest unit & integration tests |
| `npx tsc --noEmit` | Run TypeScript type check |

---

## API Reference

- `GET /api/health` — Returns `{ storage, realtime, ai }` status
- `GET /api/confessions` — List approved confessions (`?q=&category=&sort=newest|top&limit=20&offset=0`)
- `POST /api/confessions` — Submit a confession (rate-limited, AI-moderated, AI-reacted; returns `201` or `422` if rejected)
- `GET /api/confessions/random` — Return a random approved confession
- `GET /api/confessions/[id]` — Fetch a single approved confession
- `DELETE /api/confessions/[id]` — Admin-only deletion
- `POST /api/confessions/[id]/react` — Toggle an emoji reaction (`{ emoji, action: "add" | "remove" }`)
- `POST /api/confessions/[id]/report` — Report a confession (`{ reason }`) to flag it for admin review
- `POST /api/ai/moderate` — Rate-limited standalone NVIDIA Nemotron moderation check
- `POST /api/ai/react` — Rate-limited standalone NVIDIA Nemotron reaction generator
- `POST /api/admin/login` & `DELETE /api/admin/login` — Admin login / logout
- `GET /api/admin/moderate` & `PATCH /api/admin/moderate` — Admin queue listing, counts, `approve`, `reject`, `regenerate_ai`, and `delete`

---

## Security & Privacy

- **Secret Hygiene**: `.env` and `.env*.local` are ignored by `.gitignore`; never commit `NVIDIA_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `ADMIN_SESSION_SECRET`.
- **IP Privacy**: Client IPs are hashed with SHA-256 + `IP_HASH_SALT` before rate limiting or storage.
- **Abuse Protection**: Separate sliding-window rate limits protect confession posting, emoji reactions, community reports, standalone AI endpoints, and admin login attempts.
