# Who Is Smartest — 🧠 The Intelligence Matchup Game

Inspired by **Facemash**, **Who Is Smartest** is a gorgeous, high-performance web game where users vote on who the smartest people in all of history are and view the global leaderboard in real-time.

Live Domain: **[whoissmartest.com](https://whoissmartest.com)**

---

## 🛠️ Architecture & Tech Stack

The application has been completely modernized into a lightweight **Dual-Mode Serverless Application** optimized for Vercel:

* **Frontend:** Single-page Vanilla HTML/CSS/JS with a highly polished chalkboard-inspired theme, micro-animations, silent keyboard shortcuts (Left/Right Arrows), and responsive layouts tailored for mobile devices.
* **Serverless API Backend:** Serverless functions inside the `/api` directory running on Vercel Node.js 18+ to communicate securely and atomically with Supabase:
  * [api/minds.js](file:///mnt/c/Users/edmac/OneDrive/Desktop/Extreme%20Coding/whoissmartest/api/minds.js) — Seeding, self-healing, and listing candidate profiles.
  * [api/vote.js](file:///mnt/c/Users/edmac/OneDrive/Desktop/Extreme%20Coding/whoissmartest/api/vote.js) — Atomically processes voter clicks and updates Elo ratings server-side.
* **Database:** Shared **Supabase PostgreSQL database** hosting global, real-time metrics.
* **Telemetry & Analytics:** Integrated with **Vercel Web Analytics** for privacy-friendly, zero-cookie visitor and demographic tracking.

---

## 📊 How It Works

* **Seeding:** The application comes with **47 preloaded intellectual giants** (Albert Einstein, Marie Curie, Alan Turing, Charles Darwin, Euclid, Rene Descartes, etc.) loaded with high-quality public-domain images.
* **Self-Healing DB:** The backend automatically compares database records against the preloaded arrays on launch. Any missing default candidate is instantly added to your Supabase tables with **1400.0 Elo**.
* **Elo Calculations:** Ratings are dynamically calculated using the standard mathematical Elo rating system:
  * Starting Elo: `1400.0`
  * Rating multiplier: `K = 32`
  * Atomic server-side calculations prevent vote collision overwrite issues when multiple people vote simultaneously.
* **Real-Time Sync:** Active clients poll the shared ratings silently every 4 seconds in the background (battery-safe, pausing automatically when the user switches browser tabs) to sync leaderboards instantly across all global devices.

---

## 🚀 Local Development Setup

To run or preview the frontend locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/edmac232/whoissmartest.git
   cd whoissmartest
   ```

2. **Launch static file server:**
   Open `index.html` directly in any web browser, or launch a local static server:
   ```bash
   npx live-server
   ```

*Note: Relative Serverless API endpoints inside `/api` will gracefully fail when running locally without a backend. The frontend automatically detects this offline/local environment and seamlessly falls back to a **local browser sandbox** utilizing `localStorage` to compute and display rankings locally!*

---

## ☁️ Production Deployment on Vercel

The production repository is fully automated for continuous delivery to Vercel:

1. **Deploy to Vercel:** Simply push your changes to `main` branch. Vercel builds the static files and sets up the serverless APIs automatically.
2. **Environment Variables:** In your Vercel Project Settings, add your Supabase credentials:
   * `SUPABASE_URL` — Your Supabase REST project URL.
   * `SUPABASE_ANON_KEY` — Your Supabase public anonymous API Key.
