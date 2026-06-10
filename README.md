# Typerek

Predict the outcomes of football-championship matches with your friends.

Rails is an **API-only** backend — it exposes a JSON API under `/api/v1` and serves the
built React SPA from `public/`. The Docker
build compiles the SPA (`vite build`) into `public/`, so a single container serves both
the app and the API on one origin — no separate web server or CORS.

## Run with Docker Compose

**Prerequisites:** Docker and Docker Compose.

1. **Clone**
   ```bash
   git clone https://github.com/your-username/typerek.git
   cd typerek
   ```

2. **Configure** — copy `.env.example` to `.env`. It ships with development defaults;
   production overrides are documented inline (commented out).

3. **Start and seed**
   ```bash
   docker compose up --build -d
   docker compose exec web rails db:setup   # create + seed the database
   ```

4. **Open** http://localhost:8000

## Frontend development

The UI is a React + Vite SPA in [`frontend/`](frontend/). It talks to the backend only
through the `/api/v1` contract using a JWT `Authorization: Bearer` header.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api → :8000
```

Run the backend alongside it (`docker compose up -d web`). Other scripts: `npm run build`
(typecheck + production build), `npm run test` (Vitest), `npm run typecheck`,
`npm run preview`.

## WebMCP (AI agents)

The SPA registers [WebMCP](https://github.com/webmachinelearning/webmcp) tools on
`navigator.modelContext`, so in-browser AI agents can list matches, read rankings and
profiles, and place bets as the signed-in user. Browsers without native WebMCP get the
[`@mcp-b/global`](https://www.npmjs.com/package/@mcp-b/global) polyfill (lazy-loaded),
which the [MCP-B extension](https://docs.mcp-b.ai) bridges to MCP clients such as
Claude. Tools reuse the signed-in user's JWT and go through the same `/api/v1`
validation as the UI — betting still locks at match start. See
[`frontend/src/webmcp/`](frontend/src/webmcp/).

## Push notifications

The app sends [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
notifications to opted-in users (no Firebase — the PWA's service worker talks directly to
the browser's push service). Two kinds:

- **Match result entered** — when an admin saves a final score, everyone who opted in is
  told the result and that the ranking updated. Fired straight from the result update.
- **Unbet match reminders** — an hourly job nudges users who haven't bet a match yet at
  24h, 6h and 1h before kickoff (one push per window, deduplicated). Admins can also send
  an arbitrary broadcast from **Powiadomienia** in the nav (handy for testing).

Notifications are **opt-in**: each user turns them on under **Ustawienia → Powiadomienia
push**, which asks for browser permission and registers that device. Once on, they can
pick which kinds they want — match results and/or unbet reminders — independently.

Delivery runs on [Solid Queue](https://github.com/rails/solid_queue) (DB-backed, no
Redis); its worker/scheduler runs *inside* Puma via a plugin, so the single `web`
container handles it — nothing to add to nginx or systemd.

> **iOS/iPadOS:** Web Push only works for a PWA **added to the home screen** (iOS 16.4+),
> not a regular Safari tab. This is an Apple limitation and applies to Firebase too.

### Setup

1. **Generate a VAPID key pair** (no Ruby needed on the host — runs in the container):
   ```bash
   docker compose run --rm web bundle exec rake typerek:vapid_keys
   ```

2. **Set the keys** in `.env` (from the command's output):
   ```bash
   export VAPID_PUBLIC_KEY=...
   export VAPID_PRIVATE_KEY=...
   export VAPID_SUBJECT=mailto:you@example.com
   ```
   The public key is passed into the SPA build automatically (the
   `VITE_VAPID_PUBLIC_KEY` build arg reads `VAPID_PUBLIC_KEY`), so you don't set it twice.

3. **Rebuild, migrate, restart** so the SPA bakes in the key, the new tables are
   created, and the in-Puma Solid Queue worker picks them up:
   ```bash
   docker compose up --build -d
   docker compose exec web rails db:migrate   # push_subscriptions + Solid Queue tables
   docker compose restart web
   ```

Leaving the VAPID vars unset disables push entirely — the app still boots and the toggle
just stays unavailable. For local `npm run dev`, put `VITE_VAPID_PUBLIC_KEY=...` in
`frontend/.env` instead (the Vite build arg only applies to the Docker image).

## Beta instance

Run a second instance on port `8001` against the same database, to test changes before
deploying to production.

1. Create `.env.beta` from your `.env` (same `SECRET_KEY_BASE` and DB credentials; keep
   `PORT=8000` — the host port mapping handles the difference).
2. Start / stop:
   ```bash
   docker compose -f docker-compose.beta.yaml up --build -d   # http://localhost:8001
   docker compose -f docker-compose.beta.yaml down
   ```

> The beta instance shares the `typerek_default` network and Postgres container with the
> main app, so run migrations with care — a non-backwards-compatible migration on beta can
> affect production.

## Database backups

The production database is the `typerek_production` database inside the `postgres`
service. Its data lives on the named Docker volume `postgres`
(`/var/lib/postgresql/data`), so it survives container restarts and rebuilds — but **not**
`docker compose down -v` or a lost host. Take logical dumps regularly.

`pg_dump` runs inside the container, so you never need to install Postgres on the host.
Local socket connections are trusted, so no password is required. `POSTGRES_USER` is read
from the container's environment.

**Create a backup** (custom format, compressed — the most flexible to restore):

```bash
docker compose exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -Fc typerek_production' \
  > typerek_$(date +%F).dump
```

Prefer a plain SQL dump you can read/grep? Pipe it through gzip:

```bash
docker compose exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" typerek_production' \
  | gzip > typerek_$(date +%F).sql.gz
```

**Restore** a custom-format dump (drops and recreates objects in place — stop the `web`
service first so nothing writes mid-restore):

```bash
docker compose stop web
docker compose exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" --clean --if-exists -d typerek_production' \
  < typerek_2026-06-10.dump
docker compose start web
```

A gzipped SQL dump restores by piping into `psql`:

```bash
gunzip -c typerek_2026-06-10.sql.gz \
  | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" typerek_production'
```

**Schedule it** with a host cron entry (run from the project directory so Compose finds
`.env` and `docker-compose.yaml`). Daily at 03:00, keeping the last 14 days:

```cron
0 3 * * * cd /path/to/typerek && docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc typerek_production' > backups/typerek_$(date +\%F).dump && find backups -name 'typerek_*.dump' -mtime +14 -delete
```

> Dumps contain every user's data — store them off the production host (e.g. an
> object-storage bucket) and treat them as secrets.

## Credits

Team flags come from [flag-icons](https://github.com/lipis/flag-icons) (MIT). The package is
a frontend dependency, so all ~250 country flags are available; mapping a new team's name to
its ISO code in [`frontend/src/lib/flags.ts`](frontend/src/lib/flags.ts) is all that's needed.
