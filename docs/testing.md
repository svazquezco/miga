# Testing

## Required checks

```sh
pnpm test
pnpm run build
pnpm run format:check
```

`pnpm run typecheck` checks TypeScript without bundling.

Release Please manages `CHANGELOG.md`. Prettier skips that generated file.

## Coverage

Vitest runs `tests/*.test.ts`: safety, time boundaries, hydration, calculations,
input validation, and storage recovery. Domain tests use fixed times.

Tests must cover safety branches, time boundaries, arithmetic invariants, and
destructive storage behavior. Bug fixes should add a regression test where
practical. No coverage percentage is claimed.

Browser tests are currently disabled. Check navigation, persistence, offline
use, and desktop and mobile layouts manually with the production preview.

## CI

`.github/workflows/ci.yml` runs formatting, unit tests, and the build on pushes,
pull requests, and manual dispatches. It uses `.nvmrc` and `pnpm install --frozen-lockfile`.
The **Quality checks** job must pass.

Build output is retained for seven days. Actions use pinned commit SHAs and
read-only repository access. Dependabot checks JavaScript dependencies and Actions weekly;
updates still require review and passing CI.
