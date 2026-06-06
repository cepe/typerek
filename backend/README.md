# Typerek — backend (Java / Spring Boot)

A 1:1 reimplementation of the Rails `/api/v1` backend in **Java 21 + Spring Boot 3 +
Gradle + Lombok**. It talks to the **same PostgreSQL schema** (no model changes) and
serves the built React SPA from the same origin (no CORS), exactly like the Rails app.
The frontend is unchanged — it depends only on the `/api/v1` contract.

## Requirements

- **JDK 21** to run the Gradle build. Gradle 8.10 / Spring Boot 3.3 / Lombok do **not**
  run on JDK 24/25 yet, so use 21 even if a newer JDK is your default:
  ```bash
  sdk install java 21.0.5-tem      # one-time
  sdk use java 21.0.5-tem          # this shell, or: export JAVA_HOME=$(sdk home java 21.0.5-tem)
  ```
- **Docker** running — the tests use Testcontainers (Postgres). The Docker build needs
  no local JDK.

## Build & test

```bash
./gradlew build      # compile + test (Testcontainers Postgres) + fat jar
./gradlew test       # tests only
./gradlew bootRun    # run locally (needs a reachable Postgres + env, see below)
```

The jar lands in `build/libs/typerek-backend-*.jar`.

> Testcontainers note: Docker Engine 29 (API ≥ 1.52) needs Testcontainers ≥ 1.21 and a
> pinned client API version — see `build.gradle` (`testcontainers.version`) and
> `src/test/resources/docker-java.properties` (`api.version=1.44`). On macOS the build
> also points `DOCKER_HOST` at Docker Desktop's `~/.docker/run/docker.sock`.

## Configuration (env)

Same variable names as the Rails `.env`, plus an explicit DB name:

| Variable | Notes |
|---|---|
| `SECRET_KEY_BASE` | JWT HS256 secret. **Reuse the Rails value** so existing logins/JWTs stay valid across the cutover. |
| `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | DB connection. |
| `POSTGRES_DB` | **Must be set explicitly** — Rails used `typerek_production` (it appends the env). Prod: `typerek_production`, beta: `typerek_beta`. |
| `PORT` | Bind port (default 8000). |
| `TYPEREK_DISCORD_URL` | Optional; served to signed-in users via `GET /api/v1/me`. |
| `APP_SEED` | `true` enables a dev-only seeder (admin + sample matches) — only when the DB is empty. Never in prod. |

`spring.jpa.hibernate.ddl-auto=validate`: the app never alters the schema; it only
validates its entity mapping against the existing tables on boot.

## Running locally with the frontend

```bash
APP_SEED=true POSTGRES_DB=typerek_development SECRET_KEY_BASE=dev-secret-please-change-32-bytes-min \
  ./gradlew bootRun
# in another shell:
cd ../frontend && npm run dev      # proxies /api → :8000
```

## Run alongside Rails (beta-style, same database)

The Java app can run next to the Rails prod (or beta) on the **same Postgres**, just
like the beta instance — handy to validate it against real production data before the
cutover. `docker-compose.java-shared.yaml` joins the main stack's `typerek_default`
network and connects to its `postgres` container; the Rails stack is untouched.

```bash
cp .env.java-shared.example .env.java-shared
# edit: SECRET_KEY_BASE = the prod value, POSTGRES_PASSWORD = the prod value,
#       POSTGRES_DB=typerek_production   (or typerek_development locally)
docker compose -f docker-compose.java-shared.yaml --env-file .env.java-shared up --build -d
# Java on 127.0.0.1:8002   (Rails stays on :8000, beta on :8001)
```

`--env-file` is **required**: it bypasses the repo's root `.env` (which sets
`COMPOSE_PROJECT_NAME=typerek`), so the Java app stays in its own isolated
`typerek-java` project and can never disturb the production stack. Stop it with the
same flags: `docker compose -f docker-compose.java-shared.yaml --env-file .env.java-shared down`.

Reach it on the prod host via an SSH tunnel (`ssh -L 8002:127.0.0.1:8002 host`) or a
temporary nginx `location` → `127.0.0.1:8002`.

Sharing the live DB is safe by design — `ddl-auto: validate` never alters the schema,
and Rails/Java read & write the same tables with identical semantics. Caveats while
both run in parallel:
- Use the **same `SECRET_KEY_BASE`** so JWT logins work on either instance.
- **Invitations don't cross over** — a link issued by Rails won't validate on Java
  (different token scheme) and vice versa; accept each on the instance that issued it.
- Writes are real: bets/results/users entered via Java land in the production data.

## Cutover (replacing the Rails container)

The backend serves the SPA itself (see `Dockerfile`, multi-stage: build SPA → bake into
`static/` → Spring Boot fat jar). To switch production from Rails to Java:

1. Point the compose `web` service build at `backend/Dockerfile` (build context = repo
   root), keeping the service name, port 8000 and the `/up` healthcheck.
2. Add `POSTGRES_DB=typerek_production` to the env (Rails relied on Rails appending it).
3. `docker compose build web && docker compose up -d web`. nginx still proxies `:8000`.
4. **Rollback** = revert the compose build pointer to the Rails `Dockerfile` and `up -d`.
5. After cutover, admins re-send any invitations issued by Rails in the last 72 h — those
   tokens are not validatable by the Java backend (it uses its own token scheme).

Validate on the beta instance (`:8001`, `POSTGRES_DB=typerek_beta`) before prod.
