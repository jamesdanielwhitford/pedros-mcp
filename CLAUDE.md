# Pedro's Claude Ordering Tool

Claude-based ordering tool for Pedro's: lets a customer order and pay for a meal through any Claude surface (claude.ai, Desktop, Code), via a remote MCP server registered as a Claude Connector. Menu comes from Pedro's existing API; payment via Payfast (Pedro's existing online acquirer).

## Status
Real architecture is still research/feasibility phase — see `ARCHITECTURE.md` (diagrams, tools, open questions). The **demo** (`pedros-mcp-demo/`, per `ARCHITECTURE.md` §11) is built and deployed to Cloudflare Workers, but blocked on a Payfast Sandbox checkout signature bug — see `.claude/sessions/overview.md` for current status and next steps. Project is now a git repo, pushed private to `github.com/jamesdanielwhitford/pedros-mcp`.
