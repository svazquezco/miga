# Testing

Run the required checks:

```sh
pnpm test
pnpm run build
pnpm run format:check
```

Use the [production preview](local-development.md) to check navigation, desktop and mobile layouts, and offline loading. Open two tabs to check persistence. Verify that a failed save remains available for retry or export, including when another tab saves first.
