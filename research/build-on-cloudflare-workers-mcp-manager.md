# Build on Cloudflare Workers - MCP Manager

Source: https://docs.mcpmanager.ai/build-your-own-mcp-server/cloudflare

---

Cloudflare Workers is one of the most popular ways to host a remote MCP server, and it’s the closest thing to a **turnkey dynamic-client-registration server**: the [Agents SDK](https://developers.cloudflare.com/agents/) gives you Streamable HTTP from an `McpAgent`, and [`workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider) makes the Worker a full OAuth 2.1 authorization server. Crucially, its registered-client storage is **Workers KV** — durable across instances — so the ephemeral-client failure that bites memory-backed frameworks doesn’t happen here. This page covers what to choose for **MCP Manager** and the one gotcha KV introduces; Cloudflare’s docs are authoritative.

## Serve Streamable HTTP from McpAgent

An `McpAgent` (a Durable Object, bound as `MCP_OBJECT`) exposes two factories: `MyMCP.serve('/mcp')` for **Streamable HTTP** and `MyMCP.serveSSE('/sse')` for the legacy SSE transport. Point MCP Manager at the **`/mcp`** endpoint. See [Build a Remote MCP server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/) and the [transport page](https://developers.cloudflare.com/agents/model-context-protocol/transport/).

Mount `/mcp` (Streamable HTTP). You
can keep `/sse` for legacy clients,
but a server exposing **only** `/sse`
won’t connect to MCP Manager, which
speaks Streamable HTTP only.

## Auth with workers-oauth-provider

`workers-oauth-provider` makes the Worker a full OAuth 2.1 authorization server (with PKCE) and **auto-publishes** the RFC 8414 (`/.well-known/oauth-authorization-server`) and RFC 9728 (`/.well-known/oauth-protected-resource`) metadata. Dynamic client registration (RFC 7591) turns on when you set the optional **`clientRegistrationEndpoint`** — set it so MCP Manager can self-register. You wire an upstream IdP handler (Google, GitHub, Auth0, Stytch, WorkOS) as the `defaultHandler`, and the Worker mints its own MCP tokens after the upstream login.

Illustrative — see github.com/cloudflare/workers-oauth-provider

This is the **standard OAuth + DCR** mode in MCP Manager — the most seamless one. You bring nothing but your approval at connect time.

## Storage: durable by default, but eventually consistent

Registered clients, grants, and tokens live in **Workers KV** (the `OAUTH_KV` binding), a global namespace. Because it’s KV and not process memory, a client MCP Manager registers is visible to every Worker isolate — so the [ephemeral-client failure](https://docs.mcpmanager.ai/build-your-own-mcp-server/debugging-self-hosted-oauth) that plagues memory-backed frameworks **does not happen here**. Dynamically-registered clients expire per `clientRegistrationTTL` (default 90 days).
The trade-off is KV’s **eventual consistency**. A client or token written on one edge may not be visible on another for a short window, so a token or authorize call made *immediately* after registration can briefly return `invalid_client` or `401` and then clear on its own. Build a little tolerance (retry/backoff) into anything that registers and immediately uses a client.

Secrets (client secrets, tokens) are
stored only by hash, and the grant’s
`props` are encrypted with the access
token as key material — so you can’t
read them out of KV without a valid
token. That’s good security hygiene;
just don’t expect to inspect grant
context directly in KV.

## MCP Manager compatibility checklist

Serve /mcp (Streamable HTTP)

Route `/mcp` to
`MyMCP.serve('/mcp')`; don’t expose
only `/sse`.

Set clientRegistrationEndpoint

Provide `clientRegistrationEndpoint`
so MCP Manager can self-register via
DCR. Without it, registration is
off.

Bind MCP\_OBJECT and OAUTH\_KV

The Durable Object (`MCP_OBJECT`)
and the KV namespace (`OAUTH_KV`)
bindings must exist in `wrangler` —
a missing binding is a common setup
failure.

Allow confidential-client registration

MCP Manager registers as a
confidential client. If you set
`disallowPublicClientRegistration: true`, that’s fine — just don’t
expect public (no-secret) client
registration to work.

Tolerate KV propagation

Expect a brief window after
registration where a call can 401;
retry rather than treating it as a
hard failure.

## Cloudflare gotchas

Transient invalid\_client right after registering

KV is eventually consistent, so a token or authorize call made immediately after DCR can briefly fail and then succeed. This is the KV analogue of the ephemeral-store problem — self-clearing, not structural. Add retry/backoff.

Map each path to the right factory:
`serve('/mcp')` for Streamable HTTP,
`serveSSE('/sse')` for legacy. When
fronting both under OAuth, use the
`apiHandlers` map form rather than a
single `apiHandler`.

scopesSupported is advisory only

The `scopesSupported` field only *advertises* scopes in metadata — it doesn’t restrict what a client may request. Enforce real authorization in your authorize handler, not by relying on that field.

## Further reading

## Build a Remote MCP server

Cloudflare’s authoritative guide to the McpAgent and the OAuth provider.

## workers-oauth-provider

The OAuth 2.1 + DCR library,
including KV storage and
configuration.

## Debug Self-Hosted OAuth

Why most frameworks hit the
ephemeral-client failure that
Cloudflare’s KV storage avoids.

## Building Your Own MCP Server

The cross-framework requirements, decision tree, and troubleshooting catalog.
