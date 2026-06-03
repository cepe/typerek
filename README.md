# Typerek

Welcome to Typerek! This application allows you and your friends to predict the outcomes of upcoming football championship matches. Follow the instructions below to set up the application in production mode using Docker Compose.

## Quick Start

### Prerequisites
- **Operating System**: Windows, macOS, or Linux
- **Software**: Docker, Docker Compose

### Installation & Configuration

1. **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/typerek.git
    cd typerek
    ```

2. **Create .env File**
   Create a `.env` file in the root directory based on `.env.example` with the following variables:
   ```plaintext
   export COMPOSE_PROFILES=postgres,web
   export COMPOSE_PROJECT_NAME=typerek
   export DOCKER_BUILDKIT=1
   export DOCKER_RESTART_POLICY=unless-stopped
   export DOCKER_WEB_PORT_FORWARD=8000
   export DOCKER_WEB_VOLUME=./log:/app/log
   export PORT=8000
   export POSTGRES_PASSWORD=password
   export POSTGRES_USER=postgres
   export RAILS_ENV=production
   export RAILS_LOG_TO_STDOUT=true
   export RAILS_MAX_THREADS=5
   export RAILS_MIN_THREADS=1
   export RAILS_SERVE_STATIC_FILES=true
   export SECRET_KEY_BASE=insecure_key_for_dev
   export TYPEREK_ADMIN_PASSWORD=password1!
   export TYPEREK_ADMIN_USERNAME=admin
   export WEB_CONCURRENCY=2
   ```
   
   For development use following variables:
   ```plaintext
   export COMPOSE_PROFILES=postgres,web
   export COMPOSE_PROJECT_NAME=typerek
   export DOCKER_BUILDKIT=1
   export DOCKER_RESTART_POLICY=no
   export DOCKER_WEB_PORT_FORWARD=8000
   export DOCKER_WEB_VOLUME=.:/app
   export PORT=8000
   export POSTGRES_PASSWORD=password
   export POSTGRES_USER=postgres
   export RAILS_ENV=development
   export RAILS_LOG_TO_STDOUT=true
   export RAILS_MAX_THREADS=5
   export RAILS_MIN_THREADS=1
   export RAILS_SERVE_STATIC_FILES=true
   export SECRET_KEY_BASE=insecure_key_for_dev
   export TYPEREK_ADMIN_PASSWORD=password1!
   export TYPEREK_ADMIN_USERNAME=admin
   export WEB_CONCURRENCY=0
   ```

### Running the Application

1. **Build and Run the Containers**
    ```bash
    docker-compose up --build -d
    ```

2. **Set Up the Database with Seed Data**
    ```bash
    docker-compose exec web rails db:setup
    ```

3. **Access the Application**
   Open your browser and navigate to `http://localhost:8000`


### Frontend / Styling (Tailwind CSS)

The UI is built with [Tailwind CSS](https://tailwindcss.com), compiled by a Node-based
toolchain that is intentionally framework-agnostic so it can carry over to a future
React + Vite frontend.

- **Source files**
  - `app/frontend/styles/application.tailwind.css` — input (design tokens + `@layer components`)
  - `tailwind.config.js` — theme (brand colors, Roboto) and content globs
- **Compiled output**: `app/assets/stylesheets/application.css` — served by the Rails asset pipeline.

**Docker (production):** the CSS is built automatically inside the image — the
`builder` stage runs `npm ci` and `npm run build:css` before `assets:precompile`.
So `docker-compose up --build` produces fresh styles with no manual step; just commit
your view changes.

**Local development:** a copy of `application.css` is committed so the app renders
without Node. While editing views/helpers (i.e. the Tailwind classes used), run the
watcher so styles rebuild on save:

```bash
npm install        # once, installs Tailwind (see package.json)
npm run watch:css  # rebuild on change while developing views
# or a one-off build:
npm run build:css
```

> **Note:** [Node.js](https://nodejs.org) is only needed to build CSS locally — the
> running app does not require it. The Docker build handles CSS on its own.

**Team flags:** country flags in `app/assets/images/flags/` are vendored SVGs from the
[`flag-icons`](https://github.com/lipis/flag-icons) package (only the ~48 teams in play).
The Polish-name → ISO-code map lives in `MatchesHelper::TEAM_FLAGS`. To add a flag:
`cp node_modules/flag-icons/flags/4x3/<code>.svg app/assets/images/flags/` and add the
mapping.


### Running a Beta Instance

You can run a second instance of the app on port `8001` connected to the same database, useful for beta testing new changes before deploying to production.

1. **Create `.env.beta`** based on your `.env` file. You can keep the same `SECRET_KEY_BASE` and database credentials — just make sure `PORT=8000` stays as is (the host port mapping handles the difference).

2. **Start the beta instance**
   ```bash
   docker compose -f docker-compose.beta.yaml up --build -d
   ```
   The beta app will be available at `http://localhost:8001`. Logs go to `./log-beta/`.

3. **Stop the beta instance**
   ```bash
   docker compose -f docker-compose.beta.yaml down
   ```

> **Note:** The beta instance joins the `typerek_default` network, so it connects to the same Postgres container as the main app. Run database migrations with care — a migration on beta may affect production if it's not backwards-compatible.

### Securing the Application with SSL

You can use [Caddy](https://caddyserver.com) to secure the application with SSL.

---

If you encounter any issues or have questions, feel free to open an issue or contact the project maintainers.

Happy predicting!