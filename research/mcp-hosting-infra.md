# MCP server hosting/infra: Cloudflare Workers

Sources:
1. https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/ (official Cloudflare guide)
2. https://developers.cloudflare.com/agents/model-context-protocol/apis/agent-api/ (official Cloudflare `McpAgent` API reference)
3. https://docs.mcpmanager.ai/build-your-own-mcp-server/cloudflare (third-party but detailed/authoritative-feeling operational notes and gotchas, cross-checks cleanly against source 1/2)

Fetched via: `better-research` (requests, full text) for all three.

## Two ways to host, and which one Pedro's needs

Cloudflare offers a stateless option (`createMcpHandler()` — no Durable Objects, simplest, but no per-session memory) and a stateful option (`McpAgent` — backed by one Durable Object per session, with persistent state, elicitation, SQL storage). Given Pedro's needs a cart that accumulates items across multiple tool calls before checkout (matching the Temporal food-ordering pattern in `research/mcp-commerce-reference-implementations.md`), **`McpAgent` is the right choice** — the stateless option would force cart state to live elsewhere (e.g. re-fetched from a DB every call), which is workable but throws away exactly the built-in mechanism Cloudflare provides for this.

## What `McpAgent` gives you (source 2)

- Extend `McpAgent`, define tools via the standard `@modelcontextprotocol/sdk` `McpServer` (`this.server.tool(...)`), export `MyMCP.serve("/mcp")` as the Worker's handler. Deployable in roughly 15 lines for the bare stateful skeleton.
- **`state`/`setState()`/`onStateChanged()`** — the built-in persisted state mechanism, exactly what a shopping cart needs (accumulate items, survive between tool calls within a session).
- **`sql`** — direct SQL queries against an embedded per-instance database, for anything cart-state alone doesn't cover.
- **`props`** — this is where OAuth identity lands: "When a user authenticates to your MCP server, their identity information and tokens are made available through the `props` parameter" — i.e. once OAuth (per `research/mcp-oauth-mechanics.md`) is wired up, the authenticated customer's identity is available directly inside every tool handler via `this.props`, without Pedro's needing to re-parse the bearer token manually.
- **Important caveat, explicitly flagged:** "State resets after the session ends... when the same client reconnects, they will start a new session, and the state will be reset." A Durable-Object-backed cart is *not* automatically a persistent multi-day cart — if Pedro's wants a cart or order history that survives across separate conversations/logins, that has to be explicitly persisted elsewhere (e.g. written out to Pedro's own order backend/DB on each cart mutation, not just left in Agent state), keyed by the authenticated user identity from `props`.
- **WebSockets Hibernation** is on by default — the Durable Object can sleep between calls and only costs compute while actively handling a request, which matters for a low-traffic single-restaurant deployment (no idle cost between orders).
- **Jurisdiction pinning** (`{ jurisdiction: "eu" }` or `"fedramp"`) is available for data-residency needs — probably not relevant for a South African restaurant's order data, but worth knowing exists if Payfast/POPIA compliance questions come up later.

## Elicitation: the mechanism that maps directly onto Payfast checkout

This is a concrete and important find. MCP's **elicitation** feature (source 2) lets a tool handler pause mid-call and ask the *user* (not the model) for input or to complete an out-of-band action, and it has two modes:

- **Form mode** — structured data collection through the client UI. Explicitly: **"Do not use form mode to request passwords, API keys, access tokens, payment credentials, or other secrets."** This directly rules out ever collecting card details through an MCP form — reinforces the existing conclusion (from `research/claude-tool-use-and-agentic-commerce.md`) that Claude/MCP must never touch raw payment data.
- **URL mode** — exactly the shape of Payfast's redirect/Onsite flow: the server sends `message`, a `url`, and a unique `elicitationId`; the client opens that URL for the user (e.g. a Payfast-hosted checkout page or the Onsite Payments modal URL); the tool call gets back `accept` (user agreed to open it), `decline`, or `cancel`. Critically: **"accept means the user consented to open the URL. It does not mean the external interaction finished."** The actual payment completion has to be signalled back separately — via Payfast's ITN webhook hitting Pedro's backend, which then updates order state, and the MCP server can send a `notifications/elicitation/complete` with the matching `elicitationId`, or the client simply polls a `get_order_status` tool afterward.
- Explicit security guidance: don't put secrets or a pre-authenticated resource URL in the elicitation `url`; bind each elicitation request to the authenticated user; verify the same user completes the external flow.

**This is the concrete mechanism for the `checkout` tool in Pedro's proposed architecture**: `checkout` calls `elicitInput` in URL mode with the Payfast checkout/redirect URL, the customer completes payment in their browser, Payfast's ITN hits Pedro's order backend to confirm, and `get_order_status` (or the elicitation-complete notification) reports the result back into the Claude conversation.

## OAuth hosting: `workers-oauth-provider`

Confirmed by both source 1 (Cloudflare's own walkthrough, using GitHub OAuth as the worked example) and source 3 (third-party operational deep-dive):

- Cloudflare's `@cloudflare/workers-oauth-provider` library turns the same Worker into a **full OAuth 2.1 authorization server with PKCE**, auto-publishing the RFC 8414 and RFC 9728 metadata documents the MCP spec requires (see `research/mcp-oauth-mechanics.md`) — meaning Pedro's doesn't have to hand-build the `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource` responses; the library does it.
- You wire in an **upstream identity provider handler** (`defaultHandler`) — GitHub, Google, Auth0, Stytch, WorkOS, etc. — and the Worker mints its own MCP-scoped tokens after that upstream login succeeds. This is the natural place to plug in Pedro's existing mobile-app login system, *if* it exposes something OAuth-compatible, or a wrapper around it, or an entirely fresh IdP (Auth0/Stytch) sitting in front of Pedro's user table.
- Registered clients/tokens are stored in **Workers KV**, which source 3 flags as a meaningful practical advantage: KV is durable across Worker isolates (unlike in-memory storage some other frameworks use), so a registered OAuth client survives across requests reliably. The tradeoff is **eventual consistency** — a token or client registered on one edge location can briefly 401 on another edge before propagating (self-resolving within a short window; needs basic retry/backoff tolerance in client-side testing, not a structural problem).
- Practical wrangler-config checklist from source 3: bind `MCP_OBJECT` (the Durable Object) and `OAUTH_KV` (the KV namespace) in `wrangler.jsonc`; serve `/mcp` via `MyMCP.serve('/mcp')` (Streamable HTTP — this is what both Anthropic's MCP connector and Cloudflare's own guide expect); set `clientRegistrationEndpoint` if Dynamic Client Registration should be available (needed for arbitrary MCP clients to self-register, though Claude's connector setup — see `research/mcp-oauth-mechanics.md` — can alternatively use CIMD or pre-registered credentials instead of DCR).

## Caveat: this is researcher-side tooling bias, not a Pedro's decision

Everything above evaluates Cloudflare Workers specifically because it's the platform this workspace (James's, not Pedro's) already has tooling and familiarity with — that's a reason to research it first, not evidence Pedro's should use it. There's no information yet on what infrastructure Pedro's actually runs (their existing mobile app backend could be on anything — AWS, a local SA hosting provider, a monolith on a VPS, etc.). Where the mobile app backend already lives matters a lot here: if it's not on Cloudflare, standing up the MCP server there anyway is still very possible (Workers can call out to any HTTP API), but it's a genuinely separate infra decision Pedro's needs to make, not a foregone conclusion. Treat this section as "here's a concretely-documented, low-effort option, given what's already known-good in this workspace," not "here's what Pedro's will use."

## Practical path, given Ritza's existing Cloudflare tooling (if Pedro's has no strong preference otherwise)

1. Scaffold via `npm create cloudflare@latest -- pedros-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless` (or the GitHub-OAuth template as a structural reference) to get an `McpAgent` skeleton immediately.
2. Build menu/cart tools first without auth, testing locally with the MCP Inspector (`npx @modelcontextprotocol/inspector@latest`) against `http://localhost:8788/mcp`.
3. Layer in `workers-oauth-provider` once an identity provider decision is made for Pedro's (existing backend vs. new Auth0/Stytch instance) — this is the same open question flagged in `research/mcp-oauth-mechanics.md`.
4. Build the `checkout` tool using elicitation URL mode pointed at Payfast's Custom Integration redirect URL (or Onsite Payments modal URL) once `research/payfast-onsite-itn-details.md` nails down exact request shapes.
5. Deploy with `npx wrangler deploy` — same tool already used elsewhere in this workspace.

## What this confirms/changes about the session-001 architecture

Strongly confirms and gives concrete implementation shape to the proposed architecture — no changes to the high-level diagram, but two things worth folding into the design explicitly:

- The `checkout` tool's implementation mechanism is now concrete: **MCP elicitation, URL mode**, not a bespoke pattern Pedro's has to invent.
- Cart/session state via `McpAgent`'s built-in `state` is *not* the same as durable order history — anything that needs to survive beyond a single connected session (saved carts, past orders) must be explicitly written through to Pedro's own order backend, not left implicit in Durable Object state.
