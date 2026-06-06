# Build context is the repository root, so this stage can see both frontend/ and backend/.
#
# Stage 1 — build the React SPA. The Java backend serves it from the same origin
# (no CORS), exactly like the Rails build did.
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 — build the Spring Boot fat jar, with the built SPA baked into the
# classpath under static/.
FROM gradle:8.10-jdk21 AS build
WORKDIR /workspace
COPY backend/ ./
COPY --from=frontend /frontend/dist/ src/main/resources/static/
RUN gradle --no-daemon bootJar

# Stage 3 — slim runtime. The temurin JRE image already ships curl (used by the
# compose healthcheck `curl localhost:8000/up`).
FROM eclipse-temurin:21-jre AS app
WORKDIR /app
RUN useradd --create-home --shell /usr/sbin/nologin appuser
COPY --from=build /workspace/build/libs/*.jar app.jar
USER appuser
EXPOSE 8000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
