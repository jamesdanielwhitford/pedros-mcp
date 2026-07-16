# MCP Connector OAuth mechanics

Sources:
1. https://sunpeak.ai/blogs/claude-connector-oauth-authentication/ (third-party developer guide, cites and links Anthropic's own docs directly)
2. https://modelcontextprotocol.io/specification/draft/basic/authorization (official MCP spec, authorization page)
3. https://platform.claude.com/docs/en/agents-and-tools/mcp-connector (official Anthropic docs, Messages API MCP connector — a different, API-level connection path, included for contrast)

Fetched via: `better-research` (requests, full text). Anthropic's own `claude.com/docs/connectors/building/authentication` page returned bot-blocked/empty on both direct and fallback fetch attempts, so source (1) is used as the primary account of that flow — it explicitly links and paraphrases the official doc throughout, and cross-checks cleanly against the official MCP spec (2).

## The core question: how does Pedro's MCP server know WHO is ordering?

**Without OAuth, it can't.** Per source (1): "Without OAuth, Claude does not forward any user identity information to your server. There are no user IDs, no session tokens, no IP addresses passed through. Your tool handlers run with no way to identify who called them." This directly resolves last session's open question — a guest-checkout-only design (no OAuth) is possible, but it means **every single order is anonymous to the server**; there is structurally no way to attach a returning customer, a saved card, or an order history to a given human without wiring up OAuth.

So: OAuth is not optional if Pedro's wants logged-in customers / saved payment methods / order history. It's only skippable if every order is meant to be a one-off guest checkout with no continuity across sessions.

## The OAuth flow (claude.ai / Desktop / mobile / Cowork clients)

Standard is **OAuth 2.1 authorization code flow with mandatory PKCE (S256)**. Full sequence (source 1, cross-checked against source 2):

1. User enables Pedro's connector in Claude.
2. Claude sends an unauthenticated request to Pedro's MCP server.
3. Server responds `401 Unauthorized` with a `WWW-Authenticate` header pointing to a Protected Resource Metadata URL (per RFC 9728 — this is a **MUST** per the MCP spec, not optional).
4. Claude fetches that Protected Resource Metadata document to find Pedro's authorization server.
5. Claude fetches the authorization server's own metadata (`.well-known/oauth-authorization-server` or `.well-known/openid-configuration`).
6. Claude registers as an OAuth client — via CIMD (Client ID Metadata Documents, preferred, no registration call needed), DCR (Dynamic Client Registration, RFC 7591, standard but now deprecated-for-backwards-compat per the spec), or Anthropic-held pre-registered credentials (`mcp-review@anthropic.com`).
7. Claude redirects the user to Pedro's authorization URL with a PKCE `code_challenge` (S256). The authorization server **MUST** advertise `"code_challenge_methods_supported": ["S256"]` or Claude refuses to proceed.
8. User signs in at Pedro's identity provider and grants consent.
9. Identity provider redirects back to **Claude's** callback URL with an authorization code.
10. Claude exchanges the code for an access + refresh token (verified via `code_verifier`), and stores both encrypted on Anthropic's side.
11. Every subsequent tool call includes the access token as a `Bearer` token in the `Authorization` header to Pedro's server.

**Callback URLs to register at the identity provider** (source 1):
- claude.ai web/desktop/mobile/Cowork: `https://claude.ai/api/mcp/auth_callback`
- Claude Code: RFC 8252 loopback redirects — must accept both `http://localhost/callback` and `http://127.0.0.1/callback` with port-agnostic matching (port varies per session)

**Important constraint:** pure machine-to-machine client-credentials OAuth (no user interaction) is **not supported** — every user must complete the interactive consent flow individually. Any server-to-server access Pedro's needs has to live inside the tool handler's own backend logic, not in Claude's credential management.

## What Pedro's server actually receives per tool call

Per the MCP spec (source 2) and source 1's code example: the access token arrives in the standard `Authorization: Bearer <token>` header on every request (never in URL query strings — spec forbids this). The MCP server:
- **MUST** validate the token was issued specifically for it as the intended audience (RFC 8707 Resource Indicators — the `resource` parameter, tying the token to Pedro's specific canonical server URI, e.g. `https://mcp.pedros.example.com/mcp`).
- **MUST NOT** accept tokens issued for some other resource/server.
- Returns `401` on invalid/expired tokens; Claude retries with refreshed token or re-triggers the auth flow.

In an SDK tool handler (TypeScript example from source 1), the token is available as `extra.authInfo?.token` — Pedro's code then validates it against its own identity provider and uses the resulting user identity to scope menu/order/payment data to that specific customer. This is the mechanism that answers "how does the backend know who's ordering": **the validated OAuth token *is* the customer identity**, not something Claude infers or passes as free-text.

## Token lifecycle

- **Storage:** Anthropic stores encrypted access + refresh tokens; Pedro's server never needs to store Claude-side session state for this.
- **Refresh:** Claude refreshes proactively (up to 5 min before expiry) and reactively on a 401. Pedro's auth server should return RFC 6749-compliant error codes (e.g. `invalid_grant`) so Claude knows to re-run the flow.
- **Disconnection:** if a user disconnects the connector in Claude settings, Anthropic deletes its stored tokens — but tokens at Pedro's own identity provider remain valid until natural expiry. If Pedro's needs to immediately revoke access on disconnect, it must call its own IdP's revocation endpoint itself; Claude does not do this automatically.
- Per the MCP spec, refresh tokens for public clients (CIMD/DCR registrations, which have no client secret) must be rotated or sender-constrained per OAuth 2.1 best practice.

## Scopes

The MCP spec (source 2) defines a fairly elaborate scope-negotiation model: initial scope comes from the `scope` parameter in the `WWW-Authenticate` 401 challenge (preferred) or falls back to `scopes_supported` in the Protected Resource Metadata. Mid-session, if a tool call needs a broader scope than already granted, the server returns `403` with `error="insufficient_scope"` and a `scope` listing what's needed, triggering a "step-up" re-authorization round-trip that unions old + new scopes. For Pedro's, this maps naturally to e.g. a base `order:read` scope for browsing/menu/status, with something like `order:write` or `payment:charge` required only when actually placing/paying for an order — letting the design ask for elevated consent only at checkout rather than upfront.

## What this means for the proposed architecture

The session-001 architecture (`Claude → MCP → Pedro's MCP Server → Menu API + Order backend → Payfast`) is **not challenged** by this research — it's confirmed and filled in:

- Pedro's MCP server needs to be its own **OAuth 2.1 resource server** (RFC 9728 Protected Resource Metadata hosted at `/.well-known/oauth-protected-resource`), pointing at an **authorization server** — which could be Pedro's existing mobile-app backend's auth system (if it already has user accounts/login) reused here, or a new one stood up just for this.
- This is a real, non-trivial new piece of infrastructure Pedro's doesn't get for free just by writing MCP tools — it directly answers the "does the mobile app backend already do this" open question from last session: **if Pedro's mobile app already has user login + an OAuth-capable identity layer, that can likely be reused as the MCP server's authorization server.** If it only does session cookies or a proprietary auth scheme, a translation layer (or a small dedicated OAuth server in front of the existing user DB) is needed.
- Guest checkout without OAuth remains architecturally simple (no auth server needed at all) but forecloses saved cards, order history, and personalization — this is a real product decision, not just an engineering one.
