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

## Credits

Team flags come from [flag-icons](https://github.com/lipis/flag-icons) (MIT). The package is
a frontend dependency, so all ~250 country flags are available; mapping a new team's name to
its ISO code in [`frontend/src/lib/flags.ts`](frontend/src/lib/flags.ts) is all that's needed.
