# Washboard

A read-only personal health dashboard built with Next.js, TypeScript, Drizzle ORM, and PostgreSQL. The weight dashboard shows a trend chart, summary metrics, and a paginated measurement history. The habit dashboard shows daily completions across named tracking periods. Manage measurements, habit periods, and daily check-ins through MCP.

## Run locally

```sh
npm ci
test -f .env || cp .env.example .env
```

Keep your existing `.env` if you already have one. Set `DATABASE_URL` to your PostgreSQL connection string. The app loads `.env` automatically.

```sh
npm run db:migrate
npm run dev
```

Open [localhost:3000](http://localhost:3000). The dashboard displays stored measurements and habit check-ins and starts empty on a fresh database. It serves personal data to anyone who can reach it, so keep it local or put the dashboard behind your host's access controls.

## Deploy to Cloudflare Workers

This app uses the OpenNext adapter for Next.js and Cloudflare Hyperdrive for PostgreSQL. The Cloudflare Worker must have a Hyperdrive binding named `HYPERDRIVE`; the app uses its connection string at runtime. Keep `DATABASE_URL` for local development and database migrations.

1. Install the configured dependencies and authenticate with Cloudflare:

   ```sh
   npm install
   npx wrangler login
   ```

2. In the Cloudflare dashboard, create a Hyperdrive configuration for the PostgreSQL database and copy its ID. Add it to `wrangler.jsonc`:

   ```jsonc
   "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "YOUR_HYPERDRIVE_ID" }]
   ```

   Use the production PostgreSQL connection string in the Hyperdrive setup. Do not commit it to this repository.

3. Apply pending database migrations from a trusted environment with `DATABASE_URL` configured:

   ```sh
   npm run db:migrate
   ```

4. Build and preview, then deploy:

   ```sh
   npm run cf:preview
   npm run cf:deploy
   ```

For local Next.js development, use `.env` as usual. For a local Worker preview, set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in your shell to the development PostgreSQL connection string.

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

Use Streamable HTTP at `http://localhost:3000/api/mcp` for local development or at the deployed HTTPS `/api/mcp` URL. Anyone who can reach the endpoint can read and modify measurements and habit tracking data.

| Tool | Input |
| --- | --- |
| `list_weight` | Optional `from`, `to`, `limit`, and `offset`. Results are newest first. |
| `add_weight` | `weight`, optional `units` and `recordedAt`. Defaults to kg and the current time. |
| `add_weights` | `entries`, an array of 1–500 measurements with the same fields and defaults as `add_weight`. The batch is inserted together. |
| `edit_weight` | `id` and fields to update. Include `weight` when changing `units`. |

Use ISO 8601 timestamps with a time zone, such as `2026-11-24T08:00:00+05:30`.

### Habit tracking

| Tool | Input |
| --- | --- |
| `create_habit_period` | `name`, `startDate`, either `months` or `endDate`, and an ordered list of 1–10 distinct `habits`. |
| `list_habit_periods` | No input. Returns period IDs and their ordered habits. |
| `rename_habit_period` | `periodId` and `name`. Renames an existing period. |
| `edit_future_habits` | `periodId` and an ordered list of 1–10 distinct `habits`. Changes start on the first day of a future period, or tomorrow (UTC) for an active period. For an active period, use the returned continuation ID for future check-ins. Clear any completed check-ins on affected dates before editing. |
| `set_habit_completion` | `periodId`, `date`, `habitIndex` (1-based), and `completed` (`true` to record, `false` to clear). |
| `list_habit_check_ins` | `periodId`, `from`, and `to`. Returns completed habits within the inclusive date range. |

Use date-only values in `YYYY-MM-DD` format. A period with a duration ends the day before its calendar-month anniversary. If the target month is shorter, the anniversary falls on the last day of that month. An explicit `endDate` is inclusive.

For example, call `create_habit_period` with:

```json
{
  "name": "Winter Arc",
  "startDate": "2026-12-01",
  "months": 3,
  "habits": ["Walk 30 minutes", "Read 10 pages", "Stretch"]
}
```

Open the **Habits** tab to switch between periods and review daily completions.

## Design

Shared CSS tokens in `app/globals.css` define the cream canvas, saturated accents, dark borders and offset shadows. Future dashboard sections can reuse the panel, section heading, and metric card styles.
