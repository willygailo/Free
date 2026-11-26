# Confession Wall (Pure HTML + CSS + Vanilla JS)

A zero-dependency, zero-build **Confession Wall** built strictly with **HTML5, CSS3, and Vanilla JavaScript**. Open it directly in a browser or deploy it to any static host (GitHub Pages, Netlify, Cloudflare Pages, S3).

## Features

- **Zero Dependencies & Zero Build Step**: No Node.js, npm, React, Next.js, Tailwind, or bundlers required.
- **Anonymous Posting & Categories**: Tag posts with `#Confession`, `#Secret`, `#Love`, `#Work`, `#School`, `#Funny`, `#Vent`, or `#Regret`.
- **Built-in Moderation & AI Companion (`js/ai.js`)**:
  - Automatically blocks emails, phone numbers, spam/phishing links, and harmful language (preserving your draft so you can revise).
  - Routes borderline posts to the Admin `Flagged` queue.
  - Generates context-aware emoji + empathetic/witty reactions.
  - **Optional AI Proxy Mode**: In **Settings**, you can optionally point to a CORS-enabled backend proxy (e.g. `http://localhost:3000`) to use live `nvidia/nemotron-3-ultra-550b-a55b` endpoints without exposing API keys in static browser code.
- **Search, Filter, Sort & Discovery**: Keyword search, category filter chips, `Newest` / `Top` sorting, `Load More` pagination, URL-hash permalinks (`#confession=<id>`), `Copy Link`, and **Surprise Me**.
- **Toggleable Emoji Reactions & Community Reporting**: `❤️`, `😂`, `😢`, `😮` reactions persisted in `localStorage` plus inline reporting.
- **Admin Dashboard (`admin.html`)**: Passcode-gated moderation queues (`Flagged`, `Pending`, `Approved`, `Rejected`), queue counts, search, `Approve`, `Reject`, `Regenerate AI`, `Delete`, `Export JSON` / `Import JSON`, and cross-tab sync via `storage` events.

## Quick Start

### Option 1: Open Directly
Open `index.html` in any modern browser.

### Option 2: Serve Locally
```bash
cd confession-wall-vanilla
python3 -m http.server 8080
```
Then visit:
- Wall: [http://localhost:8080/index.html](http://localhost:8080/index.html)
- Admin: [http://localhost:8080/admin.html](http://localhost:8080/admin.html)

**Default Admin Passcode**: `admin123` (can be changed inside `admin.html` under **Change Local Admin Passcode**).

## Project Structure

```text
confession-wall-vanilla/
├── index.html          # Main wall, permalink view, report & settings modals
├── admin.html          # Admin login & moderation dashboard
├── css/
│   └── styles.css      # Responsive dark glassmorphic styling
├── js/
│   ├── store.js        # localStorage persistence, rate limiter, JSON backup, auth
│   ├── ai.js           # Client-side moderation/reaction engine + optional proxy adapter
│   ├── app.js          # Main wall DOM controller (XSS-safe textContent rendering)
│   └── admin.js        # Admin moderation dashboard controller
├── .gitignore
└── README.md
```
