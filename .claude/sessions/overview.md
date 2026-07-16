# Sessions Overview

## Session log
| # | Date | Key outcomes |
|---|------|-------------|
| 001 | 2026-07-16 | Feasibility research: Claude tool use, Payfast integration/ITN/PCI, Claude Connectors (remote MCP) — proposed architecture, no code yet |
| 002 | 2026-07-16 | Deepened architecture research: MCP OAuth mechanics, commerce reference implementations, Cloudflare hosting option, Payfast re-verification — architecture confirmed, still no code |
| 003 | 2026-07-16 | Wrote standalone `ARCHITECTURE.md`: high-level diagram, user journey sequence diagram with checkout-timeout fallback branch, chatbot-as-future-client framing — still no code |
| 004 | 2026-07-16 | Planned a deployable demo (Payfast Sandbox + no-auth Cloudflare `McpAgent`, mocked menu): researched sandbox mechanics, fetched remaining real Cloudflare/Claude docs, wrote `ARCHITECTURE.md` §11 — still no code |
| 005 | 2026-07-16 | Built and deployed the demo (`pedros-mcp-demo/`, live on Cloudflare Workers): all four tools, Payfast signature/ITN logic, custom URL-mode elicitation (SDK gap workaround). Live test surfaced a checkout signature rejected by Payfast Sandbox — root cause suspected (PHP SDK field-order misread) but not yet fixed. Git repo initialized, pushed private to GitHub |

## Current status
- Research/feasibility phase still applies to the **real** Pedro's architecture (blocked on Pedro's-side answers, see below) — unrelated to the demo's progress.
- **Demo (`pedros-mcp-demo/`) is built and deployed**: `https://pedros-mcp-demo.james-052.workers.dev`. All four tools implemented (`get_menu`, `update_cart`, `checkout`, `get_order_status`), Payfast signature generation + ITN verification (signature, IP allowlist, amount match, validate callback) written, custom URL-mode elicitation implemented (the installed `agents` SDK 0.17.4 only supports form-mode elicitation — had to bypass the public helper and use its internal transport primitives directly). `tsc`/`oxlint` clean.
- **Blocking bug**: Payfast Sandbox rejects the checkout signature as invalid (`400: Generated signature does not match submitted signature`) when tested live via MCP Inspector. Suspected root cause: the checkout signature's field order was based on a misreading of the official PHP SDK — `array_filter(..., ARRAY_FILTER_USE_KEY)` preserves the *input* array's key order, it doesn't reorder to a canonical list. See session 005 for full detail. Nothing past `checkout` (real ITN round-trip, Claude connector test) has been verified yet because of this.
- Project is now in git — private repo at `github.com/jamesdanielwhitford/pedros-mcp`, pushed. Root `.gitignore` added (excludes `Pedros/.env`, which holds unrelated live Cloudflare/R2 credentials — never commit that file).
- OAuth is required for the real architecture only if Pedro's wants per-customer identity (saved cards, order history) — the demo skips it entirely (guest-only flow, confirmed working as designed).
- Confirmation UX (`checkout` held open pending ITN, falls back to `pending` + `get_order_status` poll) implemented and locally verified to degrade gracefully — not yet verified against a real Payfast ITN due to the signature bug blocking checkout entirely.
- Key research saved in `research/` (21 files, see prior sessions) plus the PayFast PHP SDK source cloned to scratchpad during signature debugging (not committed — external reference only).

## Next session checklist
- [ ] Fix the Payfast checkout signature field-order bug in `pedros-mcp-demo/src/payfast.ts` (`buildCheckoutSignature`) — verify against a real PHP SDK test fixture, not just re-reading the source
- [ ] Re-test checkout via MCP Inspector against the deployed Worker, confirm Payfast Sandbox accepts the redirect
- [ ] Complete a real sandbox payment (test buyer `sbtu01@payfast.io` / `clientpass`) and confirm the ITN webhook actually confirms the order — still fully unverified against a real Payfast-originated request
- [ ] Add the deployed URL as a custom connector in Claude, run one full order end-to-end in an actual conversation
- [ ] (Real architecture, still separately blocked) Confirm with Pedro's: existing Payfast integration path, guest vs. saved-card checkout, actual infrastructure, checkout timeout value
