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
(typecheck + production build), `npm run typecheck`, `npm run preview`.

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
