# StreakFlow — Gamified Productivity & Habit Consistency PWA

StreakFlow is a local-first, installable Progressive Web Application (PWA) designed to transform daily task management into an encouraging, consistency-focused habit experience.

## Features Implemented

1. **Dashboard**:
   - Personalized time-of-day greeting, formatted local date, global search bar, theme cycler (`Light` / `Dark` / `System`), and live streak badge.
   - **Daily Progress Card**: Animated SVG circular progress ring, tasks completed vs. scheduled today, earned XP breakdown (Task XP + Daily Goal Bonus), and daily goal completion indicator.
   - **Consistency & Streak Card**: Current streak, longest historical streak, total productive days, daily qualification badge, and supportive non-punishing motivational guidance.
   - **Today's Tasks & Rapid Quick-Add**: Inline quick-add bar with priority (`HIGH`, `MEDIUM`, `LOW`) and category selectors, plus full task cards with animated completion checkboxes, XP pills, due times, tags, and edit/delete actions.
   - **Weekly Overview (Recharts)**: Real-time 7-day bar and target-line chart tracking daily completions and goal consistency rate.
   - **Level & Recent Achievements**: Level progression bar, level titles, unlocked milestone badges, and live XP activity feed.
2. **8 Complete Views**:
   - `Dashboard`, `Today's Focus`, `All Tasks` (search, status/priority/category filters, custom sorting), `Priority Board` (3-column Kanban with drag-and-drop + accessible 1-click priority shift controls), `Streak Calendar` (monthly calendar with activity intensity levels + Day Inspector panel), `Achievements` (8 milestone badges with progress bars and unlock timestamps), `Statistics` (14-day XP area chart + category stacked bar chart + KPI cards), and `Settings`.
3. **Deterministic Streak, XP & Achievement Engine (`src/engine/streakEngine.ts`)**:
   - Local calendar date key normalization (`YYYY-MM-DD`) safe across midnight boundaries and timezones.
   - Configurable daily goal by **Completed Tasks** or **Earned XP**.
   - Single-award XP ledger preventing duplicate rewards on reloads or repeated clicks, with clean XP reversal when tasks are reopened.
   - Archived completion preservation so deleting old completed tasks never corrupts historical streaks.
   - Versioned localStorage schema (`STORAGE_SCHEMA_VERSION = 2`) with validated JSON backup export/import and safe reset confirmation dialogs.
4. **Progressive Web App (PWA)**:
   - Configured with `vite-plugin-pwa`, standalone `manifest.webmanifest`, offline app-shell Service Worker (`sw.js`), vector maskable icons (`icon-192.svg`, `icon-512.svg`), and SPA routing configuration for Netlify (`netlify.toml`) and Vercel (`vercel.json`).

## Technology Stack

- **Frontend**: React 18, TypeScript 5, Tailwind CSS 3
- **Charts & Icons**: Recharts, Lucide React
- **Animations & Dates**: Framer Motion / CSS spring transitions, `date-fns` compatible local date engine
- **Build & PWA**: Vite 5, `vite-plugin-pwa`
- **Testing**: Node.js built-in test runner (`node:test` & `node:assert/strict`)

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Run the 15 automated unit tests
npm test

# 4. Build for production
npm run build

# 5. Preview the production PWA build locally
npm run preview
```

## Deployment Instructions (Netlify / Vercel)

- **Netlify**: Connect the repository or drag-and-drop the build folder. `netlify.toml` is pre-configured with `command = "npm run build"`, `publish = "dist"`, and SPA `/* -> /index.html` redirects.
- **Vercel**: Import the project into Vercel. `vercel.json` is pre-configured with SPA rewrites to `/index.html`.
