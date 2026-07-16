# Claude Connector Authentication: How OAuth Works and When You Need It (May 2026) - sunpeak

Source: https://sunpeak.ai/blogs/claude-connector-oauth-authentication/

---

**TL;DR:** Claude Connector OAuth is only required if your connector accesses private user data. The MCP spec mandates OAuth 2.1 with PKCE, not plain OAuth 2.0. Claude supports three registration approaches: Dynamic Client Registration (DCR), Client ID Metadata Documents (CIMD), and Anthropic-held credentials. Your MCP server must host Protected Resource Metadata so Claude can discover your authorization server. For local development, you can build and test connector behavior without any auth.

Authentication trips up a lot of connector developers because it’s not required by default, and the requirements only surface at submission time or when accessing protected resources. The MCP authorization spec has also evolved since early 2025, so guides from six months ago may describe an older flow. Here’s what you actually need to know as of May 2026.

## When OAuth Is Required

Not every Claude Connector needs auth. Whether you need it depends on what your connector does and who it’s for.

**You do not need OAuth if:**

* Your connector accesses public data (public APIs, open datasets, public RSS feeds)
* Your connector accesses an internal service where all users share the same credentials
* You are building a development connector just for your own use

**You need OAuth if:**

* Your connector accesses private user data (email, calendar, documents, CRM records)
* Each user should only see their own data
* You are submitting to the [Connectors Directory](https://claude.ai/connectors) and your connector requires per-user authentication

Without OAuth, Claude does not forward any user identity information to your server. There are no user IDs, no session tokens, no IP addresses passed through. Your tool handlers run with no way to identify who called them. If you need to know which Claude user is calling your connector, OAuth is the only mechanism Claude supports.

## How the OAuth Flow Works

Claude Connector OAuth follows the OAuth 2.1 authorization code flow with PKCE and user consent. Claude handles the browser redirect, token management, and token refresh. You configure the OAuth application at your identity provider and host the discovery documents on your MCP server.

The flow works like this:

1. A user enables your connector in Claude.
2. Claude sends an unauthenticated request to your MCP server.
3. Your server responds with `401 Unauthorized` and a `WWW-Authenticate` header pointing to your Protected Resource Metadata.
4. Claude fetches your Protected Resource Metadata document to find your authorization server.
5. Claude fetches your authorization server’s metadata (via `.well-known/oauth-authorization-server` or `.well-known/openid-configuration`) to learn the endpoints and supported features.
6. Claude registers as a client (via CIMD, DCR, or pre-registered credentials).
7. Claude redirects the user to your authorization URL with a PKCE `code_challenge` using the S256 method.
8. The user signs in at your identity provider (Google, GitHub, your own auth system) and grants consent.
9. The identity provider redirects back to Claude’s callback URL with an authorization code.
10. Claude exchanges the code for an access token and refresh token (verifying with `code_verifier`), and stores them encrypted.
11. On every subsequent tool call, Claude includes the access token as a `Bearer` token so your server can authorize the user.

Two important constraints. First, **pure client credentials flow (machine-to-machine OAuth without user interaction) is not supported.** Every user must complete the interactive consent flow to authenticate their individual account. If you need background, server-to-server access, that has to live inside your tool handlers, not in Claude’s credential management.

Second, **PKCE is mandatory.** Claude sends a `code_challenge` with `code_challenge_method=S256` on every authorization request. Your authorization server must support S256 PKCE and advertise `"code_challenge_methods_supported": ["S256"]` in its metadata. If your authorization server doesn’t advertise PKCE support, Claude will refuse to proceed.

## Client Registration Approaches

Claude supports three ways to register as an OAuth client with your authorization server. The [official Claude authentication docs](https://claude.com/docs/connectors/building/authentication) describe each:

**oauth\_cimd (Client ID Metadata Documents):** Claude uses an HTTPS URL as its `client_id`. Your authorization server fetches the metadata document from that URL to learn Claude’s redirect URIs and client name. This is the preferred path for new connectors because it requires no registration calls and works across authorization servers without prior setup. Your authorization server needs to support URL-formatted client IDs per the [OAuth Client ID Metadata Document draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00).

**oauth\_dcr (Dynamic Client Registration):** Claude registers itself automatically using [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591). Your authorization server exposes a `registration_endpoint` in its metadata, and Claude posts its client metadata to register. This is the standard OAuth 2.0 approach and works with most identity providers that support dynamic registration.

**oauth\_anthropic\_creds:** Anthropic holds the client credentials directly. Contact `mcp-review@anthropic.com` to set this up. This option exists for connectors where the other approaches don’t fit.

For most new connectors, CIMD or DCR is the right choice. If your identity provider supports URL-formatted client IDs, CIMD is simpler because there’s no registration step. If your provider has a standard registration endpoint, DCR works well.

The [MCP specification](https://modelcontextprotocol.io/specification/draft/basic/authorization) requires protected MCP servers to implement OAuth 2.0 Protected Resource Metadata ([RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)). This is how Claude discovers your authorization server.

Your MCP server needs to do two things:

**1. Return a 401 with a `WWW-Authenticate` header** when Claude sends an unauthenticated request:

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"
```

You can also include a `scope` parameter to tell Claude which scopes to request:

```
WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource",
                         scope="files:read"
```

**2. Host the metadata document** at the URL you specified. The document tells Claude where your authorization server lives:

```
{
  "resource": "https://mcp.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["files:read", "files:write"],
  "bearer_methods_supported": ["header"]
}
```

The `resource` field must match your MCP server URL exactly. The `authorization_servers` field must include at least one authorization server. Claude uses the first entry.

If your server doesn’t include the `resource_metadata` URL in the `WWW-Authenticate` header, Claude will probe `/.well-known/oauth-protected-resource/<path>` and `/.well-known/oauth-protected-resource` as fallbacks.

## Configuring OAuth Callback URLs

The callback URL depends on which Claude surface your users connect from.

**Claude.ai web, desktop, mobile, and Cowork** all use:

```
https://claude.ai/api/mcp/auth_callback
```

**Claude Code** uses RFC 8252 loopback redirects on ephemeral ports. Your authorization server must accept both `http://localhost/callback` and `http://127.0.0.1/callback` with port-agnostic matching, because the port varies per session.

Where you add these depends on your identity provider:

* **Google:** Google Cloud Console > APIs & Services > Credentials > your OAuth 2.0 client > Authorized redirect URIs
* **GitHub:** GitHub Developer Settings > OAuth Apps > your app > Authorization callback URL (GitHub only supports one, so you may need two apps or use a proxy)
* **Auth0, Okta, custom:** Add the URLs to your application’s allowed callback URLs

If you’re building for the Connectors Directory, make sure all callback URLs are registered. Missing callback URLs are a common rejection reason.

## Setting Up OAuth for a Custom Connector

When you add a custom connector in Claude Settings, auth is optional. You can add a connector with just an MCP server URL for development and testing.

If your MCP server needs to protect its endpoints with OAuth:

1. Go to [Claude Settings > Connectors](https://claude.ai/customize/connectors) (Pro/Max) or Organization settings > Connectors (Team/Enterprise).
2. Click **+** and choose **Add custom connector**.
3. Enter your MCP server URL (e.g., `https://abc123.ngrok-free.app/mcp`).
4. Open **Advanced settings**.
5. Enter your OAuth **Client ID** and (optionally) **Client Secret**. The Client Secret field is optional because some setups use public clients.
6. Save.

For local development, you usually skip this. Test your connector’s tool behavior and UI rendering without auth, then wire up real OAuth when you’re ready to deploy.

## OAuth Requirements for the Connectors Directory

If you’re submitting to the [Connectors Directory](https://claude.ai/connectors), the auth requirements are stricter. The full submission requirements are covered in the [Connectors Directory submission guide](https://sunpeak.ai/blogs/claude-connector-directory-submission).

**If your connector requires authentication:**

* Use OAuth 2.1 with PKCE (S256 challenge method).
* Register all necessary callback URLs with your identity provider.
* Host Protected Resource Metadata at `/.well-known/oauth-protected-resource`.
* Provide a test account with sample data for Anthropic’s reviewers. They need to authorize your connector and verify it works.
* Pure client credentials flow is not supported.

**If your connector does not require authentication:**

* No OAuth setup needed.
* Reviewers will test without authenticating.

Beyond OAuth, every tool in your connector must include a `title` annotation plus a `readOnlyHint` or `destructiveHint`. Missing tool annotations account for a large share of Directory rejections, so don’t skip them even though they’re not OAuth-specific.

## Token Lifecycle

Understanding how Claude manages tokens helps you avoid confusion around token expiry and revocation.

**Storage:** Anthropic stores encrypted access tokens and refresh tokens. Your server does not need to manage token storage for Claude’s requests. The access token arrives as a `Bearer` token in each request.

**Refresh:** Claude handles token refresh automatically. It refreshes proactively up to 5 minutes before token expiry and reactively when it gets a 401 response. You should return RFC 6749-compliant error codes (like `invalid_grant`) so Claude can re-initiate the auth flow when needed. For public-client connections (DCR or CIMD), rotate refresh tokens or apply sender constraints per OAuth 2.1 best practices.

**Disconnection:** When a user disconnects your connector in Claude settings, Anthropic removes the stored tokens from their systems. However, tokens at your identity provider remain valid until they expire. If your application needs to immediately cut off access when a user disconnects, call your identity provider’s token revocation endpoint separately. Claude does not do this automatically.

**No user metadata without auth:** Without an OAuth token, Claude does not pass user information to your server. If you need per-user data segmentation, OAuth is the only way to get it.

## What Claude Passes to Your Server

When Claude calls a tool on an authenticated connector, the access token arrives in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

You validate this token the same way you would for any OAuth-protected API. Verify it against your identity provider, extract the user identity, and use it to scope the data you return. Per the MCP spec, your server must also validate that the token was issued specifically for your server as the intended audience.

Without OAuth, there is no `Authorization` header. Your tool handlers receive the tool arguments only, with no user context.

## Testing Auth Locally

For local development, you can build and test your connector’s tool behavior and UI without going through OAuth. Run your MCP server locally and connect to it directly. This lets you iterate on tool logic and resource rendering without wiring up an identity provider.

When you’re ready to test real OAuth end-to-end:

1. Deploy your server or expose it with ngrok (`ngrok http 3000`).
2. Register your OAuth app at your identity provider with the Claude callback URLs.
3. Host your Protected Resource Metadata document at `/.well-known/oauth-protected-resource`.
4. Add your connector in Claude Settings with your Client ID and Secret.
5. Enable the connector in a conversation. Claude will redirect you through the OAuth consent flow.

If you’re using [sunpeak](https://sunpeak.ai/), the local Inspector lets you develop and test connector behavior (tool calls, resource rendering, simulations) without any auth. When you’re ready for the real OAuth flow, expose your sunpeak server with ngrok and add it as a custom connector. The [Claude Connectors tutorial](https://sunpeak.ai/blogs/claude-connectors-tutorial) covers the full local-to-production flow including ngrok setup and custom connector configuration.

Here’s what reading the access token looks like in a typical MCP server tool handler. The token arrives via the MCP SDK’s `extra` parameter:

```
export default async function (args: { query: string }, extra: ToolHandlerExtra) {
  const token = extra.authInfo?.token;
  if (!token) {
    throw new Error('Authentication required');
  }

  // Use the token to call your identity provider or resource server
  const results = await fetchUserData(token, args.query);

  return {
    structuredContent: { results },
  };
}
```

The `extra.authInfo` object contains the access token from the `Authorization` header. This works the same whether the request comes from Claude, ChatGPT, or any other MCP host, because it’s part of the MCP protocol, not specific to any host.

For a broader look at how OAuth 2.1 works across MCP hosts (including ChatGPT-specific details and discovery document setup), see the [MCP App Authentication guide](https://sunpeak.ai/blogs/mcp-app-authentication-oauth). If your connector needs to reach the [Connectors Directory](https://claude.ai/connectors), start by building and testing your tool behavior locally, then add OAuth at your identity provider when you’re ready to submit. The [Connectors Directory submission guide](https://sunpeak.ai/blogs/claude-connector-directory-submission) covers the full requirements.
