# Pedro's Claude Ordering Tool

Claude-based ordering tool for Pedro's: lets a customer order and pay for a meal through any Claude surface (claude.ai, Desktop, Code), via a remote MCP server registered as a Claude Connector. Menu comes from Pedro's existing API; payment via Payfast (Pedro's existing online acquirer).

## Status
Research/feasibility phase for the real architecture — see `ARCHITECTURE.md` for the current architecture (diagrams, tools, open questions) and `.claude/sessions/overview.md` for session history and next steps. A separate, fully-scoped **demo plan** (Payfast Sandbox + no-auth Cloudflare Workers, mocked menu) is ready to build — see `ARCHITECTURE.md` §11. No code written yet.
