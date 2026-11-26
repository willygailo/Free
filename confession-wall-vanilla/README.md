# Confession Wall (Pure HTML + CSS + Vanilla JS)

A zero-dependency, zero-build **Confession Wall** built strictly with **HTML5, CSS3, and Vanilla JavaScript**. Open to everyone—no login, no admin gate, and no approval queue.

## Features

- **Open to Everyone (No Admin Gate)**: Anyone can open `index.html`, read confessions, react with emojis, reply anonymously, and post immediately onto the wall.
- **Anonymous Posting, Moods & Editing**: Tag posts with categories (`#Confession`, `#Secret`, `#Love`, `#Work`, `#School`, `#Funny`, `#Vent`, `#Regret`) and optional mood badges (`🌙 Late Night`, `💔 Heartache`, `😤 Venting`, `🤫 Deep Secret`, `🌟 Hopeful`), plus edit or delete your own browser-created posts anytime.
- **Anonymous Human Replies & Bookmarks**: Leave anonymous replies under any confession (`💬 Replies`) and bookmark favorite posts (`🔖 Saved`) to revisit later.
- **Payo AI — Context-Aware Multi-Turn Advice (`#advice`) & Card Advice Drawer**: Say anything freely (up to 3,000 characters in English, Tagalog, or Taglish), choose an advisor persona (*Warm & Empathetic*, *Taglish Bestie*, *Practical Coach*, *Calm Mentor*), and get structured reflection + action steps + follow-up questions that retain topic context across turns (*Love*, *Work*, *School*, *Family*, *Anxiety*, *Crisis Support*).
- **UX Polish & Portability**: Draft auto-save, `Ctrl/Cmd + Enter` shortcuts, Light/Dark theme toggle (`🌙` / `☀️`), `Escape` & backdrop modal dismissal, keyword search, `Newest` / `Top` sort, **Surprise Me**, and `Export JSON` / `Import JSON` backup inside **Settings**.

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
│   └── styles.css      # Responsive dark & light glassmorphic styling
├── js/
│   ├── store.js        # localStorage persistence, replies, bookmarks, drafts, theme & backup
│   ├── ai.js           # Context-aware Payo AI, safety & reaction engine + optional proxy
│   └── app.js          # Main wall & AI Advice DOM controller (XSS-safe textContent rendering)
├── .gitignore
└── README.md
```
