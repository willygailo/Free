# Confession Wall (Pure HTML + CSS + Vanilla JS)

A zero-dependency **Confession Wall** built around a single expressive **Chat-Box Card** with live **mood-triggered visual effects**, instant **Payo AI advice** on Send (even for short words like `"sad"` or `"happy"`), and a clean **public confessions list** where everyone can read, react, and reply.

## Highlights

- **One Unified Chat-Box Card**: Type anything—even `"sad"`, `"happy"`, `"malungkot"`, or `"kilig"`—and press **Enter** / **Send** (minimum 2 characters).
- **Live Mood Effects (`js/effects.js`)**:
  - `happy` → Golden confetti & sparkle burst + warm halo
  - `sad` → Gentle falling raindrops + soft blue-indigo glow
  - `love` → Floating glowing hearts + rose glow
  - `angry` / `stressed` → Ember burst + calming wave
  - `anxious` → Slow breathing aura ring
  - `tired` / `neutral` → Rising moon & stardust sparkles
- **Instant AI Advice on Send (`js/ai.js`)**: Automatically detects English, Tagalog, and Taglish emotions and responds immediately inside the chat card with empathetic advice + actionable steps, while also attaching the advice to your posted confession.
- **Clean Public Confessions List (`naka list lang`)**: Browse other users' confessions with mood tags, AI advice bubbles, toggleable emoji reactions (`❤️ 😂 😢 😮`), anonymous replies, bookmarks (`🔖 Saved`), search, and sort.
- **Shared Cross-User Wall on GitHub Pages**:
  - Works offline out of the box via `localStorage`.
  - To let **every visitor on different phones/computers see each other's confessions live**, run `supabase-public.sql` once in a free Supabase project and paste your `supabaseUrl` & `supabaseAnonKey` into `js/config.js` (or the **⚙️ Settings** modal).

## Quick Start

```bash
python3 -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080), or visit the live GitHub Pages site at [https://willygailo.github.io/Free/](https://willygailo.github.io/Free/).
