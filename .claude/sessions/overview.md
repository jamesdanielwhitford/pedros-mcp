# Sessions Overview

## Session log
| # | Date | Key outcomes |
|---|------|-------------|
| 001 | 2026-07-16 | Feasibility research: Claude tool use, Payfast integration/ITN/PCI, Claude Connectors (remote MCP) — proposed architecture, no code yet |
| 002 | 2026-07-16 | Deepened architecture research: MCP OAuth mechanics, commerce reference implementations, Cloudflare hosting option, Payfast re-verification — architecture confirmed, still no code |
| 003 | 2026-07-16 | Wrote standalone `ARCHITECTURE.md`: high-level diagram, user journey sequence diagram with checkout-timeout fallback branch, chatbot-as-future-client framing — still no code |
| 004 | 2026-07-16 | Planned a deployable demo (Payfast Sandbox + no-auth Cloudflare `McpAgent`, mocked menu): researched sandbox mechanics, fetched remaining real Cloudflare/Claude docs, wrote `ARCHITECTURE.md` §11 — still no code |

## Current status
- Research/feasibility phase only for the real architecture. Confirmed the project is buildable as a **remote MCP server** for Pedro's, registered as a Claude Connector, exposing menu + order + Payfast checkout tools. No implementation started.
- `ARCHITECTURE.md` (project root) is the canonical standalone reference — read that first, not the session notes. §11 now has a fully-scoped **demo plan** (separate from the blocked real architecture) that's ready to build: no-auth Cloudflare `McpAgent`, Payfast Sandbox, mocked menu.
- OAuth is required for the real architecture only if Pedro's wants per-customer identity (saved cards, order history) — the demo skips it entirely (guest-only flow). MCP's elicitation (URL mode) is the concrete mechanism for the checkout tool's Payfast redirect/modal step.
- Cloudflare Workers (`McpAgent` + `workers-oauth-provider`) researched as one concrete hosting option for the *real* architecture, still flagged as this workspace's own tooling bias since Pedro's actual infrastructure is unknown — but now committed to for the *demo*, where that bias doesn't matter.
- Confirmation UX decided: `checkout` tool call stays held open server-side until Payfast's ITN webhook confirms (or a timeout elapses), so Claude reports final order status as its next message without the customer needing to ask "did it go through?". Falls back to `get_order_status` polling only if ITN is slower than the timeout. Payfast Sandbox sends each ITN only once (no retry) — a real divergence from production this logic needs to tolerate when testing against the demo.
- Payfast Sandbox confirmed self-serve/instant (email signup, no KYC), separate merchant credentials, dummy-wallet-only payment method, full ITN support.
- Key research saved in `research/` (21 files): Payfast developer docs + sandbox mechanics, Claude tool-use mechanics + agentic commerce context, Claude Connectors/remote MCP + custom connector setup, MCP OAuth mechanics, commerce reference implementations, Cloudflare Workers hosting (McpAgent, Durable Objects, no-auth wrangler config, multi-route Worker composition, local dev secrets, remote MCP testing).

## Next session checklist
- [ ] Sign up for Payfast Sandbox (or use the shared public test credentials directly)
- [ ] Scaffold the demo with `npm create cloudflare@latest -- pedros-mcp-demo --template=cloudflare/ai/demos/remote-mcp-authless`
- [ ] Implement the four tools (get_menu, create_order/update_cart, checkout, get_order_status) plus the Payfast ITN webhook route
- [ ] Test locally, deploy, add as a custom connector in Claude, run one real order end-to-end
- [ ] (Real architecture, still separately blocked) Confirm with Pedro's: existing Payfast integration path, guest vs. saved-card checkout, actual infrastructure, checkout timeout value
