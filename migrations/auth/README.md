# Authentication schema migrations

## Overview

This directory stores the opt-in Better Auth PostgreSQL schema in [0001_auth.sql](./0001_auth.sql). The deploy migrator reads `migrations/` without recursion. Copying the SQL file directly into `migrations/` makes it eligible for that runner. [scripts/migrate.mjs:migrationsDir] [scripts/migrate.mjs:main] [scripts/migration-plan.mjs:pendingMigrations]

## Interface

The SQL declares four tables and three explicit indexes. Every identifier is double-quoted. In the tables below, `None` means no default or additional constraint is declared.

### `"user"`

Source: [migrations/auth/0001_auth.sql:"user"].

| Column            | Type          | Nullability | Default             | Additional constraint |
| ----------------- | ------------- | ----------- | ------------------- | --------------------- |
| `"id"`            | `text`        | `NOT NULL`  | None                | `PRIMARY KEY`         |
| `"name"`          | `text`        | `NOT NULL`  | None                | None                  |
| `"email"`         | `text`        | `NOT NULL`  | None                | `UNIQUE`              |
| `"emailVerified"` | `boolean`     | `NOT NULL`  | None                | None                  |
| `"image"`         | `text`        | Nullable    | None                | None                  |
| `"createdAt"`     | `timestamptz` | `NOT NULL`  | `CURRENT_TIMESTAMP` | None                  |
| `"updatedAt"`     | `timestamptz` | `NOT NULL`  | `CURRENT_TIMESTAMP` | None                  |

### `"session"`

Source: [migrations/auth/0001_auth.sql:"session"].

| Column        | Type          | Nullability | Default             | Additional constraint                        |
| ------------- | ------------- | ----------- | ------------------- | -------------------------------------------- |
| `"id"`        | `text`        | `NOT NULL`  | None                | `PRIMARY KEY`                                |
| `"expiresAt"` | `timestamptz` | `NOT NULL`  | None                | None                                         |
| `"token"`     | `text`        | `NOT NULL`  | None                | `UNIQUE`                                     |
| `"createdAt"` | `timestamptz` | `NOT NULL`  | `CURRENT_TIMESTAMP` | None                                         |
| `"updatedAt"` | `timestamptz` | `NOT NULL`  | None                | None                                         |
| `"ipAddress"` | `text`        | Nullable    | None                | None                                         |
| `"userAgent"` | `text`        | Nullable    | None                | None                                         |
| `"userId"`    | `text`        | `NOT NULL`  | None                | `REFERENCES "user" ("id") ON DELETE CASCADE` |

### `"account"`

Source: [migrations/auth/0001_auth.sql:"account"].

| Column                    | Type          | Nullability | Default             | Additional constraint                        |
| ------------------------- | ------------- | ----------- | ------------------- | -------------------------------------------- |
| `"id"`                    | `text`        | `NOT NULL`  | None                | `PRIMARY KEY`                                |
| `"accountId"`             | `text`        | `NOT NULL`  | None                | None                                         |
| `"providerId"`            | `text`        | `NOT NULL`  | None                | None                                         |
| `"userId"`                | `text`        | `NOT NULL`  | None                | `REFERENCES "user" ("id") ON DELETE CASCADE` |
| `"accessToken"`           | `text`        | Nullable    | None                | None                                         |
| `"refreshToken"`          | `text`        | Nullable    | None                | None                                         |
| `"idToken"`               | `text`        | Nullable    | None                | None                                         |
| `"accessTokenExpiresAt"`  | `timestamptz` | Nullable    | None                | None                                         |
| `"refreshTokenExpiresAt"` | `timestamptz` | Nullable    | None                | None                                         |
| `"scope"`                 | `text`        | Nullable    | None                | None                                         |
| `"password"`              | `text`        | Nullable    | None                | None                                         |
| `"createdAt"`             | `timestamptz` | `NOT NULL`  | `CURRENT_TIMESTAMP` | None                                         |
| `"updatedAt"`             | `timestamptz` | `NOT NULL`  | None                | None                                         |

### `"verification"`

Source: [migrations/auth/0001_auth.sql:"verification"].

| Column         | Type          | Nullability | Default             | Additional constraint |
| -------------- | ------------- | ----------- | ------------------- | --------------------- |
| `"id"`         | `text`        | `NOT NULL`  | None                | `PRIMARY KEY`         |
| `"identifier"` | `text`        | `NOT NULL`  | None                | None                  |
| `"value"`      | `text`        | `NOT NULL`  | None                | None                  |
| `"expiresAt"`  | `timestamptz` | `NOT NULL`  | None                | None                  |
| `"createdAt"`  | `timestamptz` | `NOT NULL`  | `CURRENT_TIMESTAMP` | None                  |
| `"updatedAt"`  | `timestamptz` | `NOT NULL`  | `CURRENT_TIMESTAMP` | None                  |

### Explicit indexes

| Index                           | Indexed columns                 | Source                                                        |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| `"session_userId_idx"`          | `"session" ("userId")`          | [migrations/auth/0001_auth.sql:"session_userId_idx"]          |
| `"account_userId_idx"`          | `"account" ("userId")`          | [migrations/auth/0001_auth.sql:"account_userId_idx"]          |
| `"verification_identifier_idx"` | `"verification" ("identifier")` | [migrations/auth/0001_auth.sql:"verification_identifier_idx"] |

Each explicit index uses `CREATE INDEX IF NOT EXISTS`. [migrations/auth/0001_auth.sql:"session_userId_idx"] [migrations/auth/0001_auth.sql:"account_userId_idx"] [migrations/auth/0001_auth.sql:"verification_identifier_idx"]

## Invariants

- Preserve quoted camelCase identifiers, including `"emailVerified"`, `"createdAt"`, and `"userId"`. The SQL header requires these spellings for Better Auth queries. [migrations/auth/0001_auth.sql:"emailVerified"] [migrations/auth/0001_auth.sql:"createdAt"] [migrations/auth/0001_auth.sql:"userId"]
- Every table requires a primary-key `"id"`. `"user"."email"` and `"session"."token"` are unique. [migrations/auth/0001_auth.sql:"user"] [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"] [migrations/auth/0001_auth.sql:"verification"]
- `"session"."userId"` and `"account"."userId"` reference `"user"."id"` with `ON DELETE CASCADE`. [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"]
- The SQL header marks this generated file as requiring changes through new ordered migration files. Applied migration names are basenames, and the planner skips names already recorded. [migrations/auth/0001_auth.sql:DO NOT EDIT] [scripts/migration-plan.mjs:migrationName] [scripts/migration-plan.mjs:pendingMigrations]

## Side Effects

- Executing the SQL creates the four tables and three explicit indexes when absent, using `IF NOT EXISTS`. [migrations/auth/0001_auth.sql:"user"] [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"] [migrations/auth/0001_auth.sql:"verification"] [migrations/auth/0001_auth.sql:"session_userId_idx"] [migrations/auth/0001_auth.sql:"account_userId_idx"] [migrations/auth/0001_auth.sql:"verification_identifier_idx"]
- Once the schema exists, deleting a referenced `"user"` row also deletes referencing `"session"` and `"account"` rows. [migrations/auth/0001_auth.sql:"session"] [migrations/auth/0001_auth.sql:"account"]
- `npm run db:migrate` invokes the deploy migrator. With `DATABASE_URL` and eligible direct SQL files, it connects to PostgreSQL, executes each pending file in a transaction, and records the filename in `_migrations`. [package.json:scripts.db:migrate] [scripts/migrate.mjs:databaseUrl] [scripts/migrate.mjs:main]

## Verification

From the repository root, run `npm test`. The configured command runs Node tests under `scripts/**/*.test.mjs`, followed on success by the typed app-data, gate-identity, and chess tests. [package.json:scripts.test]

`npm run db:migrate` applies database changes. Use it as an explicit migration operation; the automated verification command is `npm test`. [package.json:scripts.db:migrate] [package.json:scripts.test]
