# Reference implementations: commerce/ordering/payment MCP servers

Sources:
1. https://docs.stripe.com/agentic-commerce/apps (Stripe official — monetizing MCP apps)
2. https://docs.stripe.com/mcp (Stripe official — the Stripe MCP server itself)
3. https://deepwiki.com/temporal-community/temporal-ai-agent/5.5-mcp-tools-(food-ordering) (concrete open-source food-ordering agent built on MCP + Stripe)

Fetched via: `better-research` (requests, full text) for all three.

## Two different things that both get called "Stripe MCP" — don't conflate them

**(A) Stripe's own hosted MCP server** (source 2, `mcp.stripe.com`) is a *developer* tool: it exposes generic Stripe API access (`stripe_api_read`/`stripe_api_write`, refunds, account info, docs search) so a coding agent or AI workflow builder can manage a Stripe account conversationally. This is not a customer-facing ordering flow — it's closer to "Stripe admin via chat." Not directly reusable for Pedro's customer-ordering use case, but relevant as a pattern: Stripe explicitly recommends **human confirmation of tools** and warns about **prompt injection when combining with other MCP servers** — worth carrying into Pedro's own tool design (e.g. require explicit confirmation before `checkout`/`charge`-type tools execute).

**(B) Stripe's "MCP apps" monetization framework** (source 1) is the actually-relevant one: a documented pattern for *product-facing* MCP apps running inside ChatGPT/Claude, e.g. "book hotels, order groceries, buy clothes... without leaving chat." This confirms Pedro's use case (food ordering via MCP) is a recognized, named category Stripe is actively building for, not a novel edge case.

## The two monetization patterns Stripe documents (source 1)

| | **Redirect** | **Instant Checkout** |
|---|---|---|
| Mechanism | Send the customer to a prebuilt Stripe-hosted checkout page in a new tab | Complete payment without leaving the chat |
| Maturity | Publicly available | OpenAI private beta only (ChatGPT-specific, not yet general) |
| Effort | Little/no additional code — promo codes, tax, localization, subscriptions all built in | Requires custom API integration, more code to maintain |
| Best for | Common cases, teams that don't need custom checkout logic | Complex custom flows, teams with engineering resources to maintain it |

**Direct implication for Pedro's:** this maps almost exactly onto the two Payfast integration options already documented in `research/payfast-developer-docs.md` — Payfast's **Custom Integration (redirect)** is the direct analogue of Stripe's "Redirect" pattern, and Payfast's **Onsite Payments (in-page modal)** is the analogue of "Instant Checkout." Stripe's own guidance — start with redirect unless you specifically need to keep the user in-chat and have engineering resources to maintain a custom flow — is a reasonable steer for Pedro's first version too, especially since Payfast's Onsite Payments is itself still Beta.

## Concrete open-source pattern: Temporal AI Agent's food-ordering example (source 3)

This is the single most directly analogous example found: a working "Tony's Pizza Palace" ordering agent, MCP + Stripe, browse → cart → checkout.

**Tool split — native vs. MCP:**
- `AddToCart` is a **native tool** (not MCP) — a stateful, local cart accumulator. It takes `customer_email`, `item_name`, `item_price`, `quantity`, and an optional `stripe_product_id`. Items are accumulated locally *before* any Stripe call is made, explicitly to avoid hitting the payment API once per cart edit.
- Actual payment goes through **Stripe's MCP tools**, filtered down to only what's needed for this goal: `list_products`, `list_prices`, `create_customer`, `create_invoice`, `create_invoice_item`, `finalize_invoice`. The `included_tools` filter on the MCP server definition explicitly excludes unrelated Stripe capability (e.g. subscriptions, payment-method management) so the LLM can't reach for tools out of scope for this flow.

**Design lesson — keep the "shopping" phase off the payment rail entirely.** Cart-building is deliberately a *local, non-MCP, non-payment* tool; only the final checkout step touches the actual payment provider. For Pedro's, this argues for structuring things the same way: `get_menu`/`search_menu` and cart-building tools are plain backend calls against Pedro's own order/menu API, and only the `checkout` tool ever talks to Payfast — matching the architecture already proposed in session-001.

**Gotchas worth inheriting:**
- `create_invoice_item` (Stripe) doesn't accept a `quantity` param — the agent has to be explicitly instructed to call it once per unit ("call `create_invoice_item` twice for 2 pizzas"). This is a reminder that **tool descriptions must spell out non-obvious API quirks explicitly**, since the LLM has no other way to know. Payfast's own API will have its own such quirks (found or not yet found in `research/payfast-onsite-itn-details.md`) — worth documenting equally explicitly in Pedro's own tool descriptions once its checkout tool is built.
- A default (`days_until_due=7`) is silently injected server-side if the LLM omits a required parameter — a defensive pattern (fill in safe defaults for parameters the model is likely to forget) rather than relying on the model to always supply everything.
- MCP tool arguments arrive as **strings** from the LLM and need explicit type coercion (`"5"` → `int`, `"true"` → `bool`, etc.) before use — a concrete implementation detail Pedro's MCP server will also need to handle unless the SDK/framework used does this automatically.
- Failures are recorded back into the conversation so the agent can explain what went wrong / retry — i.e. `tool_result` on error should be a clear, actionable error message, not a raw exception.

## What this confirms/changes about the session-001 architecture

Nothing overturned; this strongly **validates** the proposed shape:

```
Claude → MCP → Pedro's MCP Server → Menu API + Order backend → Payfast
```

Refinements worth folding in:
- Keep menu/cart tools as plain internal calls; isolate the payment-provider call to a single `checkout` tool, mirroring the Temporal example's native-cart / MCP-payment split.
- Filter/scope whatever tools are exposed tightly to the ordering flow — don't expose a general "call any Payfast endpoint" tool the way Stripe's raw MCP server does; that pattern is for developer tooling, not customer-facing agents.
- Add human-confirmation semantics on the checkout/payment tool (Stripe's own advice, source 2) — likely via MCP's `destructiveHint`/confirmation annotations mentioned in `research/mcp-oauth-mechanics.md`'s Connectors Directory section.
- No evidence found of an existing Payfast-specific MCP server or a general "food ordering + Payfast" reference implementation — Pedro's would be building the payment-tool layer from scratch against Payfast's API (Custom/Onsite + ITN), using Stripe's MCP-app patterns and the Temporal example as structural guides, not literal code to reuse.
