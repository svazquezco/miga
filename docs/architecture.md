# Architecture

Miga is a browser-only PWA built with React, TypeScript, and Vite. Fonts and assets ship with the app.

## Structure

- `src/App.tsx` manages hash navigation, application state, and updates across tabs.
- `src/pages/` contains screens. `src/components/` contains shared UI elements.
- `src/domain/starter.ts` contains the domain logic shared by the guide, assistant, and calculator.
- `src/storage/local.ts` validates and persists data in localStorage under `miga:starter:v1`.

## Storage and offline use

The storage layer blocks writes when saved data is unreadable or uses a newer schema. If storage is full, the app keeps changes in memory for retry or export.

`public/manifest.webmanifest` defines installation metadata. In production, `public/sw.js` tries the network first for navigation and serves cached HTML offline. It checks the cache first for assets.
