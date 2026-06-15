<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/db

Postgres persistence for mPilot — a Drizzle ORM client + schema for agents, ticks, proposals, executions, session keys, and the EOA-fallback queue.

## Quickstart

```ts
import { createDbClient } from '@mpilot/db';

const db = createDbClient(process.env.DATABASE_URL!);
// db is a Drizzle client bound to the mPilot schema (re-exported from this package).
```

## Exports

- **`createDbClient(url)` → `DbClient`** — a pooled Drizzle client over `pg`.
- **Schema** — all table definitions and row types, re-exported from `@mpilot/db`.

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
