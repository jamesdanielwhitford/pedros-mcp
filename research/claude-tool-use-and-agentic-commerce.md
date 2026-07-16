Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
Fetched via: WebFetch (worked directly, no JS-shell issue)

# Claude tool use (Messages API)

- Claude tool use lets you define a tool with a JSON `input_schema`; Claude decides when to call it and returns a `tool_use` content block naming the tool + structured input arguments.
- Your application (client tool) executes the actual side effect (e.g. hit the menu API, call Payfast) and returns a `tool_result` block with the outcome; Claude continues the conversation using that result.
- This round trip (tool_use -> your code executes -> tool_result -> Claude replies) is the whole mechanism — directly maps onto: "look up menu item" tool, "add to cart" tool, "create Payfast payment request" tool, "check order status" tool.
- `tool_choice` can force Claude to always call a tool, or leave it to auto-detection based on the system prompt and the tool's description.
- `strict: true` on a tool definition guarantees Claude's call matches your schema exactly — useful for order/payment-shaped tools where malformed input is unacceptable.
- Nothing in this page grants Claude the ability to execute real-world side effects itself — every "tool" is code *you* write and run; Claude only ever proposes the call. This means all payment/order logic (signature generation, hitting Payfast, validating ITN) lives in your backend, not in the model.
- No specific built-in warning language about human-in-the-loop confirmation was present on this page itself (it's a mechanics/reference page); this is a design decision left to the integrator.

# Agentic commerce protocols (industry context, not Anthropic/Payfast specific)

Source: search results summarizing https://docs.stripe.com/agentic-commerce/acp and related pages (not fetched in full text — treat as directional context, not a verified spec)

- Stripe + OpenAI + Meta jointly built the **Agentic Commerce Protocol (ACP)**, live in ChatGPT since September 2025: an open standard for how an AI agent completes a purchase on behalf of a user — cart management, checkout, and payment via a "payment handler" delegation model.
- Core payment security pattern: the agent never holds a raw card. Instead a **Shared Payment Token** is minted, scoped to a single seller and single use/limit, and only that seller can redeem it via Stripe. This is architecturally the same principle as Payfast's approach (redirect/tokenize rather than pass raw PAN through the agent).
- There's also a **Universal Commerce Protocol (UCP)** and MCP being discussed as the tool-discovery layer, with agent-to-merchant checkout riding on top.
- Takeaway for this project: the emerging industry pattern for "LLM agent + payment" is uniformly: **agent never touches card data — it only ever triggers a checkout/payment session and receives a token/status back.** This matches exactly how Payfast's Custom Integration and Onsite Payments already work (redirect or scoped modal, ITN webhook confirms). No new PCI exposure is created by inserting Claude into the flow, provided the architecture keeps Claude on the "trigger + confirm" side and never asks it to collect/relay card numbers.
