Source: search results summarizing https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp and https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
Fetched via: WebSearch (not full-text fetched; treat as directional, high-confidence given multiple corroborating results incl. official support.claude.com and platform.claude.com domains)

# Claude Connectors / remote MCP servers

- Anthropic's Model Context Protocol (MCP) is the open standard for connecting Claude to external tools/data.
- **Custom connectors via remote MCP** let a third party (e.g. Pedro's) stand up their own MCP server (hosted by them, reachable over the internet) and register it as a connector.
- Once added, this connector is available across **every Claude client**: claude.ai, Claude Desktop, Cowork, Claude Code, and mobile apps — Claude connects to the remote server from Anthropic's cloud infra, not from the user's device.
- Setup: provide the MCP server's URL; optionally configure OAuth Client ID/Secret so each user authenticates to Pedro's system (needed to know who's ordering / where to charge).
- Available on Free/Pro/Max/Team/Enterprise plans (Free limited to 1 custom connector).
- Enterprise: admins can provision org-wide via Okta.
- Security note directly from Anthropic: custom connectors let Claude "access and take action" in services not verified by Anthropic — i.e. Pedro's is fully responsible for the security of their own MCP server and its tools.

## Why this fits "any Claude surface can order a meal"
This is exactly the mechanism for the user's stated intent: build **one remote MCP server** for Pedro's (menu lookup, cart, checkout/payment tools) and any Claude interface, claude.ai chat, Claude Desktop, Claude Code, becomes a client of it via the Connectors UI. No separate "app" needs to be built per-surface.
