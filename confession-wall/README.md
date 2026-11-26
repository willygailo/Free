# Confession Wall

An anonymous, real-time **Confession Wall** built with **Next.js (App Router + TypeScript + Tailwind CSS)**, **Supabase** (with an automatic local JSON fallback for zero-config development), and **NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b`)** for AI content moderation and empathetic/witty AI reactions.

## Features

- **Anonymous Posting with Categories**: Share confessions tagged with `#Confession`, `#Secret`, `#Love`, `#Work`, `#School`, `#Funny`, `#Vent`, or `#Regret` without accounts or raw IP storage (IPs are SHA-256 hashed with a server salt).
- **NVIDIA Nemotron AI Moderation**: Every confession is checked by `nvidia/nemotron-3-ultra-550b-a55b` (`enable_thinking: true`) for hate speech, doxxing/PII, harassment, and spam. Borderline posts route to the Admin `Flagged` queue; violating posts return `422` while preserving your draft so you can revise.
- **NVIDIA Nemotron AI Companion**: Approved confessions receive a custom AI emoji and 1–2 sentence reaction displayed in an AI bubble.
- **Toggleable Reactions & Community Reporting**: React with `❤️`, `😂`, `😢`, or `😮` (tracked per browser and toggled atomically via PostgreSQL RPC or the local store), copy permalinks, or report posts for admin review.
- **Search, Filter, Sort & Surprise Me**: Search by keyword, filter by category, sort by `Newest` or `Top`, paginate with `Load More`, or jump to a random confession.
- **Dual-Mode Persistence**:
  - **Local Mode (Zero-Config)**: When Supabase env vars are placeholders, the app automatically stores data in `.data/confessions.json` (gitignored, seeded with starter confessions) so every feature works immediately on `npm run dev`.
  - **Supabase Live Mode**: Add real Supabase credentials and run `supabase/schema.sql` to enable PostgreSQL storage, RLS policies, and live Realtime updates.
- **Admin Moderation Dashboard (`/admin`)**: Password-protected with HMAC-signed HTTP-only cookies, queue counts, search filtering, moderation notes, `Regenerate AI` reaction, approve, reject, and delete actions.

---

## Setup

### 1. Install Dependencies

```bash
cd confession-wall
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required / optional variables:
- `NVIDIA_API_KEY`: Your NVIDIA NIM API key from [build.nvidia.com](https://build.nvidia.com)
- `NVIDIA_MODEL`: `nvidia/nemotron-3-ultra-550b-a55b`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Optional for local dev (leave placeholders for Local Mode, or paste real Supabase keys for Supabase Live Mode)
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `IP_HASH_SALT`

### 3. (Optional) Initialize Supabase Database

If using Supabase Live Mode, run `supabase/schema.sql` in your Supabase SQL Editor.

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/admin/login` to sign in to the moderation dashboard using `ADMIN_PASSWORD`.

---

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build production bundle
- `npm start` — Start production server
- `npm run lint` — Run ESLint
- `npm test` — Run Vitest unit & integration tests

---

## API Overview

- `GET /api/health` — Storage mode (`local` or `supabase`), Realtime status, and NVIDIA AI configuration status
- `GET /api/confessions` — List approved confessions (`?q=&category=&sort=newest|top&limit=20&offset=0`)
- `POST /api/confessions` — Submit a confession (rate-limited, AI-moderated, AI-reacted)
- `GET /api/confessions/random` — Fetch a random approved confession
- `GET /api/confessions/[id]` — Fetch a single approved confession
- `DELETE /api/confessions/[id]` — Admin-only deletion
- `POST /api/confessions/[id]/react` — Toggle an emoji reaction (`add` / `remove`)
- `POST /api/confessions/[id]/report` — Report a confession for admin review
- `POST /api/ai/moderate` & `POST /api/ai/react` — Standalone rate-limited NVIDIA Nemotron AI endpoints
- `POST /api/admin/login` & `DELETE /api/admin/login` — Admin cookie authentication
- `GET /api/admin/moderate` & `PATCH /api/admin/moderate` — Admin listing, counts, approve/reject/delete/regenerate AI
