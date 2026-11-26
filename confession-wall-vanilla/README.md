# Confession Wall (Pure HTML + CSS + Vanilla JS)

A zero-dependency, zero-build **Confession Wall** built strictly with **HTML5, CSS3, and Vanilla JavaScript**. Open to everyone—no login, no admin gate, and no approval queue.

## Features

- **Open to Everyone (No Admin Gate)**: Anyone can open `index.html`, read confessions, react with emojis, and post immediately onto the wall.
- **Anonymous Posting & Categories**: Tag posts with `#Confession`, `#Secret`, `#Love`, `#Work`, `#School`, `#Funny`, `#Vent`, or `#Regret`, and delete your own browser-created posts anytime.
- **Payo AI — Private Multi-Turn Advice (`#advice`) & Card Advice Drawer**: Say anything freely (up to 3,000 characters in English, Tagalog, or Taglish), choose an advisor persona (*Warm & Empathetic*, *Taglish Bestie*, *Practical Coach*, *Calm Mentor*), receive structured reflection + action steps + follow-up questions, or click **💡 Get AI Advice** on any wall post.
- **Built-in Safety & AI Companion (`js/ai.js`)**:
  - Automatically guards against personal contact info (emails/phones), spam links, and harmful threats (preserving your draft so you can revise), with zero hidden approval queues.
  - Generates context-aware emoji + empathetic/witty reactions instantly.
  - **Optional AI Proxy Mode**: In **Settings**, you can optionally point to a CORS-enabled backend proxy (e.g. `http://localhost:3000`) to use live `nvidia/nemotron-3-ultra-550b-a55b` endpoints without exposing API keys in static browser code.
- **Search, Filter, Sort & Discovery**: Keyword search, category filter chips, `Newest` / `Top` sorting, `Load More` pagination, URL-hash permalinks (`#confession=<id>`), `Copy Link`, **Surprise Me**, and local JSON backup export inside **Settings**.

## Quick Start

### Option 1: Open Directly
Open `index.html` in any modern browser.

### Option 2: Serve Locally
```bash
cd confession-wall-vanilla
python3 -m http.server 8080
```
Then open [http://localhost:8080/index.html](http://localhost:8080/index.html).

## Project Structure

```text
confession-wall-vanilla/
├── index.html          # Main wall, AI Advice (#advice), permalink view & settings modal
├── css/
│   └── styles.css      # Responsive dark glassmorphic styling
├── js/
│   ├── store.js        # localStorage persistence, own-post delete, rate limiter & backup
│   ├── ai.js           # Built-in safety/reaction/Payo AI engine + optional proxy adapter
│   └── app.js          # Main wall & AI Advice DOM controller (XSS-safe textContent rendering)
├── .gitignore
└── README.md
```
