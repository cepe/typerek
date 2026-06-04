# Typerek frontend (React + Vite)

Decoupled SPA for Typerek. It talks to the backend **only** through the
`/api/v1` JSON contract (see [`../openapi.yaml`](../openapi.yaml)) using a JWT
`Authorization: Bearer` header — so the backend can later be swapped from Rails to
Spring Boot without touching this app.

## Stack
React 18 + TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS
(theme + component classes ported 1:1 from the Rails app), Font Awesome 4 (CDN).
Team flags are the ~48 vendored SVGs in `public/flags/` (rendered as `<img>`, just
like the Rails `image_tag`).

## Develop
```bash
npm install
npm run dev          # http://localhost:5173
```
The dev server proxies `/api` → `http://localhost:8000` (the Rails backend), so no
CORS is needed. Make sure the backend is running and built **with the `jwt` gem**:
```bash
# from the repo root
docker compose build web && docker compose up -d web
```

## Build / check
```bash
npm run build        # tsc --noEmit (typecheck) + vite build -> dist/
npm run typecheck    # types only
npm run preview      # serve the production build
```

## Configuration
`VITE_API_BASE_URL` (optional) overrides the API base. Defaults to the relative
`/api/v1`, which works both in dev (via the proxy) and in production when the SPA
is served from the same origin as the API (Phase 3). See `.env.example`.

## Structure
```
src/
  api/        # axios client (JWT interceptor), TS types (mirror openapi.yaml), TanStack Query hooks
  auth/       # AuthContext (token in localStorage) + ProtectedRoute
  components/ # Layout, BetGrid, MatchLine, Flag, Alert, Status
  lib/        # flags (team→ISO), bet types, formatting/grouping helpers
  pages/      # Login, Home (info), Matches, Match, Ranking, Users, UserProfile, Invitation
```

## Notes / not yet done
- **i18next** is deferred — copy is currently inline Polish (as the ERB views were);
  the app is single-language for now.
- Types in `src/api/types.ts` are hand-kept in sync with `openapi.yaml`; they can be
  generated with `openapi-typescript` later.
