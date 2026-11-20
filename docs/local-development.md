# Local development

Requires Node.js 22.13+ and pnpm 11.5.3. Follow the [quick start](../README.md#start).
Vite uses localhost on port 5173. Use `pnpm run dev --port 5174` to change it.

To preview the production build:

```sh
pnpm run build
pnpm run preview --port 4173
```

Build output is in `dist/`. Offline caching works only in production over HTTPS
or localhost. Close old app tabs when checking service-worker updates.

See [testing](testing.md) for checks.
