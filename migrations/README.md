# Database migrations

## Overview

This directory is the SQL input boundary for the deploy migrator in `scripts/migrate.mjs`. It currently has no direct SQL files. Its `auth/` child stores an opt-in Better Auth schema. The deploy runner reads this directory without descending into children. [scripts/migrate.mjs:migrationsDir] [scripts/migrate.mjs:main]

## Subdirectories & Boundaries

- [auth](./auth/README.md): Four authentication tables, 34 columns, and three explicit indexes. Its SQL becomes eligible for the deploy runner after copying it directly into `migrations/`. [migrations/auth/0001_auth.sql:"user"] [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"] [migrations/auth/0001_auth.sql:"verification"] [scripts/migration-plan.mjs:pendingMigrations]

## Interface

- Direct entries ending in `.sql` are migration inputs. The external planning module `scripts/migration-plan.mjs` exports `migrationName`, `isMigrationFile`, and `pendingMigrations`. The deploy runner imports `pendingMigrations`. [scripts/migration-plan.mjs:migrationName] [scripts/migration-plan.mjs:isMigrationFile] [scripts/migration-plan.mjs:pendingMigrations] [scripts/migrate.mjs:pendingMigrations]
- The child schema exposes `"user"`, `"session"`, `"account"`, and `"verification"`. Its explicit indexes are `"session_userId_idx"`, `"account_userId_idx"`, and `"verification_identifier_idx"`; their full column contracts are in the child README. [migrations/auth/0001_auth.sql:"user"] [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"] [migrations/auth/0001_auth.sql:"verification"] [migrations/auth/0001_auth.sql:"session_userId_idx"] [migrations/auth/0001_auth.sql:"account_userId_idx"] [migrations/auth/0001_auth.sql:"verification_identifier_idx"]

## Invariants

- Migration identity is the basename returned by `migrationName`. `pendingMigrations` sorts names with `localeCompare` and skips names already recorded as applied. Add later schema changes under new ordered filenames. [scripts/migration-plan.mjs:migrationName] [scripts/migration-plan.mjs:pendingMigrations]
- SQL eligibility uses the case-sensitive `.sql` suffix, and the deploy runner's `readdir` is non-recursive. [scripts/migration-plan.mjs:isMigrationFile] [scripts/migrate.mjs:main]
- Missing `DATABASE_URL` exits successfully. An unreadable migration directory or zero eligible SQL entries returns before creating a database pool. [scripts/migrate.mjs:databaseUrl] [scripts/migrate.mjs:main]
- The child schema preserves quoted camelCase identifiers, text primary-key IDs, unique user emails and session tokens, and the two cascading user foreign keys. [migrations/auth/0001_auth.sql:"emailVerified"] [migrations/auth/0001_auth.sql:"user"] [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"] [migrations/auth/0001_auth.sql:"verification"]

## Side Effects

- `npm run db:migrate` runs `scripts/migrate.mjs`. With `DATABASE_URL` and eligible direct SQL entries, it connects through a PostgreSQL pool, creates `_migrations` if absent, reads applied names and pending SQL, and records each applied basename. `_migrations` declares `name TEXT PRIMARY KEY` and `applied_at TIMESTAMPTZ NOT NULL DEFAULT now()`. [package.json:scripts.db:migrate] [scripts/migrate.mjs:databaseUrl] [scripts/migrate.mjs:main]
- Each pending file's SQL and bookkeeping insert share one `BEGIN`/`COMMIT` transaction. Failure attempts `ROLLBACK` and propagates the error. The initial `_migrations` table creation occurs before these per-file transactions. [scripts/migrate.mjs:main]
- Executing the child SQL creates its four tables and three indexes using `IF NOT EXISTS`. Later deletion of a referenced user cascades to associated session and account rows. [migrations/auth/0001_auth.sql:"user"] [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"] [migrations/auth/0001_auth.sql:"verification"] [migrations/auth/0001_auth.sql:"session_userId_idx"] [migrations/auth/0001_auth.sql:"account_userId_idx"] [migrations/auth/0001_auth.sql:"verification_identifier_idx"]
- `npm run build` runs `npm run db:migrate` after a successful Vite build. The runner logs progress and failures; its `finally` block releases the connected client and ends the pool. [package.json:scripts.build] [scripts/migrate.mjs:main]

## Verification

From the repository root, run `npm test`. The configured command runs Node tests under `scripts/**/*.test.mjs`, followed on success by the typed app-data, gate-identity, and chess tests. [package.json:scripts.test]

`npm run db:migrate` applies database changes. Use it as an explicit migration operation; the automated verification command is `npm test`. [package.json:scripts.db:migrate] [package.json:scripts.test]
