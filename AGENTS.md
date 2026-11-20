# Agent guidance

Before work, read this file, README.md, docs/architecture.md, and docs/testing.md.

## Engineering standards

This project adopts engineering-standards **v3.0.1**. Read the relevant pinned
standards before changing their scoped content:

- [Planning](https://raw.githubusercontent.com/svazquezco/engineering-standards/v3.0.1/standards/planning.md)
- [Development](https://raw.githubusercontent.com/svazquezco/engineering-standards/v3.0.1/standards/development.md)
- [Security](https://raw.githubusercontent.com/svazquezco/engineering-standards/v3.0.1/standards/security.md)
- [Documentation](https://raw.githubusercontent.com/svazquezco/engineering-standards/v3.0.1/standards/documentation.md)
- [Testing](https://raw.githubusercontent.com/svazquezco/engineering-standards/v3.0.1/standards/testing.md)
- [Branching](https://raw.githubusercontent.com/svazquezco/engineering-standards/v3.0.1/standards/branching.md)
- [Commits](https://raw.githubusercontent.com/svazquezco/engineering-standards/v3.0.1/standards/commit-messages.md)

## Project rules

- Use `main` as the initial branch.
- Use Spanish for UI strings and SVG accessibility labels. Use English for documentation, identifiers, and tests.
- Use Node.js 22.13+ and pnpm. Install dependencies locally and keep `pnpm-lock.yaml` in version control.
- Run the [required checks](docs/testing.md).
- Keep shared domain logic in `src/domain/starter.ts`. Both the guide and the assistant use this module.
- Bundle assets and fonts locally. Do not use external APIs or analytics.
- Preserve unreadable stored data until the user explicitly chooses to replace it.
