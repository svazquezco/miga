# Architecture

Miga is a browser-only PWA built with React, TypeScript, and Vite. Fonts and assets ship with the app.

- `src/App.tsx` handles hash navigation and connects screens to the journal.
- `src/pages/` contains screens. `src/components/` contains shared UI.
- `src/domain/starter.ts` contains journal actions, recommendations, and calculations.
- `src/storage/local.ts` validates and persists the journal under `miga:starter:v1`. It protects unreadable data and keeps failed saves in memory. If another tab changes the saved copy, retry is blocked and the draft stays available to export.
- `public/sw.js` caches the production app for offline use.
