# WebMCP support for Typerek

**Date:** 2026-06-09
**Status:** Approved by user

## Goal

Let in-browser AI agents (Gemini in Chrome natively; Claude and other MCP clients via
the MCP-B extension) read Typerek data and place bets on behalf of the signed-in user,
by exposing WebMCP tools from the React SPA.

## Background

- WebMCP is a W3C draft API: `navigator.modelContext.registerTool(tool)`. It is
  flag-gated in Chrome 146+/Edge 147 and in origin trial in Chrome 149 (June 2026).
- The `@mcp-b/global` polyfill provides the same `navigator.modelContext` surface in
  browsers without native support; the MCP-B browser extension bridges those tools to
  external MCP clients (e.g. Claude) today.
- Typerek is a Rails API-only backend plus a React + Vite SPA (`frontend/`). The SPA
  talks to `/api/v1` with a JWT from `localStorage` via `frontend/src/api/client.ts`.

## Decisions (confirmed with user)

1. **Tool scope:** full suite — place bets plus read everything (matches, other users'
   bets, rankings, profiles).
2. **Compatibility:** spec-shaped `registerTool` code; load `@mcp-b/global` only when
   the native API is absent.
3. **Rollout:** enabled on all instances (no beta-only flag).
4. **Architecture:** frontend-only module. No backend changes. Alternatives rejected:
   a Rails-side MCP server (not WebMCP, extra auth plumbing) and the declarative
   HTML-attribute API (the SPA is not form-driven).

## Tools

All tools act as the signed-in user, reusing the JWT the SPA already holds. Handlers
return `{ content: [{ type: 'text', text: JSON.stringify(data) }] }`; errors return
`isError: true` with a human-readable message.

| Tool | Input | Backing endpoint |
|---|---|---|
| `list_matches` | — | `GET /matches` (upcoming + finished, odds, my bet) |
| `get_match` | `match_id: number` | `GET /matches/:id` (participants' bets once started) |
| `place_bet` | `match_id: number`, `result: enum` of `win_a, tie, win_b, win_tie_a, win_tie_b, not_tie` | `PUT /matches/:id/bet` |
| `get_ranking` | — | `GET /ranking` |
| `get_ranking_history` | — | `GET /ranking/history` |
| `get_user_profile` | `user_id: number` | `GET /users/:id` |
| `get_me` | — | `GET /me` |

Tool descriptions must explain Typerek's bet semantics (the six bet types, that bets
close at match start, that odds determine points) so an agent can bet sensibly without
reading the page.

## Components

- `frontend/src/webmcp/tools.ts` — tool definitions: name, description, JSON Schema
  `inputSchema`, async handler calling the existing `api` client from
  `frontend/src/api/client.ts`. Pure data + functions; takes the QueryClient as a
  dependency so it stays unit-testable.
- `frontend/src/webmcp/register.ts` — feature detection, dynamic
  `import('@mcp-b/global')` when `navigator.modelContext` is undefined, then one
  `registerTool` call per tool. Idempotent (safe under React StrictMode double-effects).
- `useWebMcp()` hook invoked once in `App` — passes the app's QueryClient and triggers
  registration on mount.

## Data flow

1. Agent calls a tool → handler reads the JWT at call time via the existing client.
2. Reads: response JSON is returned to the agent as text content, unmodified — the
   `/api/v1` serializers are already the public contract.
3. `place_bet`: on success, invalidate React Query keys `matches`, `match(id)`, `me`
   (mirroring `usePlaceBet`) so an open page reflects the agent's bet immediately. On a
   422 (match started since the cache was filled), invalidate `matches` and `match(id)`
   too, mirroring `usePlaceBet`'s `onError`.

## Error handling

- Signed out (no token, or 401): tool returns `isError` with "Not signed in — sign in
  to Typerek in this tab first." The existing client's 401 handling (token clear +
  `auth:unauthorized` event) still applies.
- API errors (422 betting on a started match, 404 unknown ids, and any other non-2xx):
  surface `apiErrorMessage()` text via `isError`.
- Invalid `result` values are rejected by the JSON Schema enum before reaching the API.
- Server-side validation in `Typerek::MakeBet::Handler` (match not started) remains the
  authority; the agent can do nothing the UI cannot.

## Dependencies

- `@mcp-b/global` (runtime, lazily imported).
- Vitest (dev-only) — the frontend has no test runner today; add minimal config.

## Testing

- Unit tests (Vitest) for tool handlers with the `api` client mocked: happy paths,
  signed-out error, API error mapping, cache invalidation after `place_bet`.
- `npm run typecheck` stays in the build.
- Manual verification: MCP-B extension against the beta instance — list matches, place
  a bet, confirm the UI updates and the bet appears in the API.

## Out of scope

- Backend/API changes of any kind.
- Admin tools (match editing, invitations, user management) — betting + reading only.
  This includes `GET /users` (admin-gated); `get_ranking` already lists all players.
- A standalone (non-browser) MCP server.
