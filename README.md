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


### Frontend (React + Vite)

The UI is a React + Vite single-page app in [`frontend/`](frontend/). Rails is now an
**API-only** backend: it exposes a JSON API under `/api/v1` (contract in
[`openapi.yaml`](openapi.yaml)) and serves the SPA's built assets from `public/`. The
Docker build compiles the SPA (a Node stage runs `vite build`) and copies the result
into `public/`, so a single container serves both the app and the API on one origin —
no separate web server or CORS needed.

See [`frontend/README.md`](frontend/README.md) for local development (`npm run dev`,
which proxies `/api` to the backend on `:8000`).


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