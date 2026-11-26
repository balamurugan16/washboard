# Washboard

A read-only personal health dashboard built with Next.js, TypeScript, Drizzle ORM, and PostgreSQL. The weight dashboard shows a trend chart, summary metrics, and a paginated measurement history. Entries can be managed through MCP.

## Run locally

```sh
npm ci
test -f .env || cp .env.example .env
```

Keep your existing `.env` if you already have one. Set `DATABASE_URL` to your PostgreSQL connection string and `MCP_TOKEN` to a long random secret. The app loads `.env` automatically. The MCP endpoint returns 503 until a token is configured.

```sh
npm run db:migrate
npm run dev
```

Open [localhost:3000](http://localhost:3000). The dashboard displays stored measurements and starts empty on a fresh database. It serves personal data to anyone who can reach it, so keep it local or put the dashboard behind your host's access controls.

## PostgreSQL

Drizzle queries use the typed schema in `db/schema.ts`. Update it alongside any SQL migration that changes the application schema.


After changing `db/schema.ts`, generate and review the SQL migration before applying it.

```sh
npm run db:generate -- --name=describe_change
npm run db:migrate
```

Commit the generated SQL and metadata in `db/migrations` together. Drizzle Kit records applied migrations in `drizzle.__drizzle_migrations`. The first migration recognizes the original runner's record and preserves the existing weight table and data. The original SQL is archived in `db/legacy-migrations`. Run pending migrations before starting a new deployment.

`weight` has an ID, a time-zone-aware `recorded_at` timestamp, a positive decimal weight, and units (`kg` by default, or `lb`). The chart and metrics convert mixed measurements into the selected unit. History shows the original recorded values.

## MCP

Use Streamable HTTP at `http://localhost:3000/api/mcp` with an `Authorization: Bearer <MCP_TOKEN>` header. Use HTTPS for a remote deployment. Configure the header in your MCP client.

| Tool | Input |
| --- | --- |
| `list_weight` | Optional `from`, `to`, `limit`, and `offset`. Results are newest first. |
| `add_weight` | `weight`, optional `units` and `recordedAt`. Defaults to kg and the current time. |
| `add_weights` | `entries`, an array of 1–500 measurements with the same fields and defaults as `add_weight`. The batch is inserted together. |
| `edit_weight` | `id` and fields to update. Include `weight` when changing `units`. |

Use ISO 8601 timestamps with a time zone, such as `2026-11-24T08:00:00+05:30`.

## Design

Shared CSS tokens in `app/globals.css` define the cream canvas, saturated accents, dark borders and offset shadows. Future dashboard sections can reuse the panel, section heading, and metric card styles.
