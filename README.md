# Build a Claude Ordering Connector

Tutorial: let a customer browse a menu, build a cart, and pay — entirely inside
a Claude conversation — via a remote MCP server on Cloudflare Workers, with
Payfast handling payment. Generic and reusable; not tied to any one business.

## What you're building

- An MCP server (4 tools: `get_menu`, `update_cart`, `checkout`, `get_order_status`)
- Deployed as a Cloudflare Worker, reachable at `https://<name>.<account>.workers.dev/mcp`
- Registered in Claude as a connector, so any Claude surface (claude.ai, Desktop, Code) can order through it
- Payment via Payfast's sandbox (fake card, real payment flow, real webhook)

## Prerequisites

- Node.js 18+
- A [Cloudflare](https://dash.cloudflare.com/sign-up) account (free tier is fine)
- A [Payfast sandbox](https://sandbox.payfast.co.za/) account (free, instant) — or use Payfast's public test merchant below
- Claude Desktop or claude.ai, to connect the finished server

## 1. Scaffold the Worker

```bash
npm create cloudflare@latest -- my-ordering-mcp --template=cloudflare/ai/demos/remote-mcp-authless
cd my-ordering-mcp
```

This gives you a working (authless) MCP server on Workers with one example tool.

## 2. Define the menu

Create `src/menu.ts`:

```ts
export interface MenuItem {
	id: string;
	name: string;
	category: string;
	priceCents: number;
}

export const MENU: MenuItem[] = [
	{ id: "burger", name: "Cheeseburger", category: "Mains", priceCents: 8500 },
	{ id: "fries", name: "Fries", category: "Sides", priceCents: 3500 },
	{ id: "cola", name: "Cola", category: "Drinks", priceCents: 2500 },
];

export function findMenuItem(id: string): MenuItem | undefined {
	return MENU.find((item) => item.id === id);
}
```

Prices are stored in cents to avoid floating-point rounding on money.

## 3. Add Payfast signature + webhook verification

Payfast (South African payment gateway) needs an MD5 signature on the way out
(checkout form) and verifies its own signature on the way back (the ITN
webhook that confirms payment). Create `src/payfast.ts`:

```ts
const CHECKOUT_SIGNATURE_FIELD_ORDER = [
	"merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
	"name_first", "name_last", "email_address", "cell_number", "m_payment_id",
	"amount", "item_name", "item_description", "custom_int1", "custom_str1",
	"email_confirmation", "confirmation_address",
] as const;

export interface PayfastConfig {
	merchantId: string;
	merchantKey: string;
	passphrase: string;
	sandbox: boolean;
}

export function payfastProcessUrl(config: PayfastConfig): string {
	return config.sandbox
		? "https://sandbox.payfast.co.za/eng/process"
		: "https://www.payfast.co.za/eng/process";
}

function payfastValidateUrl(config: PayfastConfig): string {
	return config.sandbox
		? "https://sandbox.payfast.co.za/eng/query/validate"
		: "https://www.payfast.co.za/eng/query/validate";
}

// Payfast expects PHP's urlencode() rules: spaces as '+', not '%20'.
function phpUrlEncode(value: string): string {
	return encodeURIComponent(value)
		.replace(/%20/g, "+")
		.replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

async function md5Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("MD5", data);
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CheckoutFields {
	return_url: string;
	cancel_url: string;
	notify_url: string;
	name_first: string;
	email_address: string;
	m_payment_id: string;
	amount: string; // decimal string, 2 places, e.g. "95.00"
	item_name: string;
	item_description?: string;
	custom_str1?: string;
}

export async function buildCheckoutSignature(fields: CheckoutFields, config: PayfastConfig): Promise<string> {
	const merged: Record<string, string> = { merchant_id: config.merchantId, merchant_key: config.merchantKey, ...fields };

	let paramString = "";
	for (const key of CHECKOUT_SIGNATURE_FIELD_ORDER) {
		const value = merged[key];
		if (value !== undefined && value !== null && value !== "") {
			paramString += `${key}=${phpUrlEncode(String(value).trim())}&`;
		}
	}
	paramString = paramString.slice(0, -1);
	if (config.passphrase) paramString += `&passphrase=${phpUrlEncode(config.passphrase.trim())}`;
	return md5Hex(paramString);
}

export async function buildCheckoutFormFields(fields: CheckoutFields, config: PayfastConfig): Promise<Record<string, string>> {
	const signature = await buildCheckoutSignature(fields, config);
	return { merchant_id: config.merchantId, merchant_key: config.merchantKey, ...fields, signature };
}

// Payfast's published ITN source IP ranges (same set for live and sandbox).
const PAYFAST_IP_RANGES = [
	"197.97.145.144/28", "41.74.179.192/27", "102.216.36.0/28", "102.216.36.128/28", "144.126.193.139",
];

function ipv4ToInt(ip: string): number | null {
	const parts = ip.trim().split(".");
	if (parts.length !== 4) return null;
	let result = 0;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) return null;
		const n = Number(part);
		if (n < 0 || n > 255) return null;
		result = (result << 8) | n;
	}
	return result >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
	const [rangeIp, prefixStr] = cidr.split("/");
	const prefix = prefixStr === undefined ? 32 : Number(prefixStr);
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
	const ipInt = ipv4ToInt(ip);
	const rangeInt = ipv4ToInt(rangeIp);
	if (ipInt === null || rangeInt === null) return false;
	if (prefix === 0) return true;
	const mask = prefix === 32 ? 0xffffffff : (~0 << (32 - prefix)) >>> 0;
	return ((ipInt & mask) >>> 0) === ((rangeInt & mask) >>> 0);
}

export function isPayfastSourceIp(ip: string): boolean {
	return PAYFAST_IP_RANGES.some((range) => (range.includes("/") ? ipv4InCidr(ip, range) : ip.trim() === range));
}

async function itnDataToString(fields: [string, string][], passphrase: string): Promise<string> {
	let paramString = "";
	for (const [key, value] of fields) {
		if (key === "signature") break;
		paramString += `${key}=${phpUrlEncode(value)}&`;
	}
	paramString = paramString.slice(0, -1);
	if (passphrase) paramString += `&passphrase=${phpUrlEncode(passphrase)}`;
	return paramString;
}

export async function verifyItnSignature(orderedFields: [string, string][], receivedSignature: string, config: PayfastConfig): Promise<boolean> {
	const paramString = await itnDataToString(orderedFields, config.passphrase);
	const expected = await md5Hex(paramString);
	return expected.toLowerCase() === receivedSignature.toLowerCase();
}

export function amountsMatch(expectedCents: number, amountGross: string): boolean {
	const expected = expectedCents / 100;
	const received = Number.parseFloat(amountGross);
	if (Number.isNaN(received)) return false;
	return Math.abs(expected - received) <= 0.01;
}

export async function confirmWithPayfast(rawBody: string, config: PayfastConfig): Promise<boolean> {
	const response = await fetch(payfastValidateUrl(config), {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: rawBody,
	});
	const text = await response.text();
	return text.trim() === "VALID";
}
```

Two things matter here and are easy to get wrong: the outbound signature must
walk fields in Payfast's exact order (not insertion order), and the ITN
handler must re-verify the signature *and* call Payfast's own `validate`
endpoint before trusting a webhook — never trust an unverified POST as proof
of payment.

## 4. Set up Cloudflare Durable Objects for order state

Order status has to be visible from two different requests — the customer's
live MCP session, and Payfast's webhook hitting your server later — so it
can't just live in the MCP session's own state. Use a Durable Object.

In `wrangler.jsonc`, add:

```jsonc
{
	"migrations": [{ "new_sqlite_classes": ["MyMCP", "OrderStore"], "tag": "v1" }],
	"durable_objects": {
		"bindings": [
			{ "class_name": "MyMCP", "name": "MCP_OBJECT" },
			{ "class_name": "OrderStore", "name": "ORDER_STORE" }
		]
	},
	"vars": {
		"DEMO_BASE_URL": "https://my-ordering-mcp.<your-subdomain>.workers.dev"
	}
}
```

You'll get the real `<your-subdomain>.workers.dev` value after your first
deploy (step 7) — come back and fill it in.

## 5. Write the MCP tools

Replace `src/index.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import { MENU, findMenuItem } from "./menu";
import {
	buildCheckoutFormFields,
	payfastProcessUrl,
	isPayfastSourceIp,
	verifyItnSignature,
	amountsMatch,
	confirmWithPayfast,
	type PayfastConfig,
} from "./payfast";

interface CartLine {
	itemId: string;
	name: string;
	priceCents: number;
	quantity: number;
}

interface Order {
	id: string;
	lines: CartLine[];
	totalCents: number;
	status: "cart" | "awaiting_payment" | "confirmed" | "cancelled";
}

interface OrderingState {
	cart: CartLine[];
	orders: Record<string, Order>;
}

const ORDER_STORE_DO_NAME = "orders";

function centsToAmountString(cents: number): string {
	return (cents / 100).toFixed(2);
}

function generateId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID()}`;
}

export class MyMCP extends McpAgent<Env, OrderingState> {
	server = new McpServer({ name: "Ordering (Demo)", version: "0.1.0" });

	initialState: OrderingState = { cart: [], orders: {} };

	private payfastConfig(): PayfastConfig {
		return {
			merchantId: this.env.PAYFAST_MERCHANT_ID,
			merchantKey: this.env.PAYFAST_MERCHANT_KEY,
			passphrase: this.env.PAYFAST_PASSPHRASE,
			sandbox: true,
		};
	}

	private async getOrderStatus(orderId: string): Promise<Order["status"] | "not_found"> {
		const id = this.env.ORDER_STORE.idFromName(ORDER_STORE_DO_NAME);
		const stub = this.env.ORDER_STORE.get(id);
		const status = await stub.getStatus(orderId);
		return (status as Order["status"] | undefined) ?? "not_found";
	}

	async init() {
		this.server.registerTool(
			"get_menu",
			{ title: "Get menu", description: "List available menu items with prices.", inputSchema: {} },
			async () => ({
				content: [
					{
						type: "text",
						text: JSON.stringify(
							MENU.map((item) => ({ id: item.id, name: item.name, category: item.category, price: centsToAmountString(item.priceCents) })),
							null,
							2,
						),
					},
				],
			}),
		);

		this.server.registerTool(
			"update_cart",
			{
				title: "Update cart",
				description: "Add, remove, or change the quantity of a menu item. Set quantity to 0 to remove an item.",
				inputSchema: {
					itemId: z.string().describe("Menu item id from get_menu"),
					quantity: z.number().int().min(0).describe("Desired quantity, 0 removes the item"),
				},
			},
			async ({ itemId, quantity }) => {
				const menuItem = findMenuItem(itemId);
				if (!menuItem) {
					return { content: [{ type: "text", text: `Unknown menu item id: ${itemId}` }], isError: true };
				}

				const cart = this.state.cart.filter((line) => line.itemId !== itemId);
				if (quantity > 0) {
					cart.push({ itemId: menuItem.id, name: menuItem.name, priceCents: menuItem.priceCents, quantity });
				}
				this.setState({ ...this.state, cart });

				const totalCents = cart.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									cart: cart.map((line) => ({ itemId: line.itemId, name: line.name, quantity: line.quantity, lineTotal: centsToAmountString(line.priceCents * line.quantity) })),
									total: centsToAmountString(totalCents),
								},
								null,
								2,
							),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"checkout",
			{
				title: "Checkout and pay",
				description: "Create a Payfast payment session for the current cart and wait for payment confirmation.",
				inputSchema: {
					customerName: z.string().describe("Customer's first name, for the Payfast form"),
					customerEmail: z.string().email().describe("Customer's email, for the Payfast form and receipt"),
				},
			},
			async ({ customerName, customerEmail }) => {
				if (this.state.cart.length === 0) {
					return { content: [{ type: "text", text: "Cart is empty — add items with update_cart before checking out." }], isError: true };
				}

				const orderId = generateId("order");
				const totalCents = this.state.cart.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
				const order: Order = { id: orderId, lines: [...this.state.cart], totalCents, status: "awaiting_payment" };
				this.setState({ ...this.state, cart: [], orders: { ...this.state.orders, [orderId]: order } });

				const doId = this.env.ORDER_STORE.idFromName(ORDER_STORE_DO_NAME);
				const doStub = this.env.ORDER_STORE.get(doId);
				await doStub.registerOrder(orderId, totalCents);

				const itemNames = order.lines.map((l) => `${l.quantity}x ${l.name}`).join(", ");
				const formFields = await buildCheckoutFormFields(
					{
						return_url: this.env.DEMO_BASE_URL + "/payment-complete",
						cancel_url: this.env.DEMO_BASE_URL + "/payment-cancelled",
						notify_url: this.env.DEMO_BASE_URL + "/webhooks/payfast-itn",
						name_first: customerName,
						email_address: customerEmail,
						m_payment_id: orderId,
						amount: centsToAmountString(totalCents),
						item_name: "Order",
						item_description: itemNames,
						custom_str1: orderId,
					},
					this.payfastConfig(),
				);

				const checkoutUrl = `${payfastProcessUrl(this.payfastConfig())}?${new URLSearchParams(formFields).toString()}`;

				// Held open pending Payfast's ITN, capped so the tool call doesn't
				// block indefinitely if the customer is slow to pay.
				const deadline = Date.now() + 15_000;
				let status = await this.getOrderStatus(orderId);
				while (status === "awaiting_payment" && Date.now() < deadline) {
					await new Promise((resolve) => setTimeout(resolve, 1_000));
					status = await this.getOrderStatus(orderId);
				}

				if (status === "confirmed") {
					this.setState({ ...this.state, orders: { ...this.state.orders, [orderId]: { ...order, status: "confirmed" } } });
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								orderId,
								status: status === "not_found" ? "awaiting_payment" : status,
								total: centsToAmountString(totalCents),
								paymentUrl: checkoutUrl,
							}),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"get_order_status",
			{ title: "Get order status", description: "Check the latest status of a previously placed order by id.", inputSchema: { orderId: z.string() } },
			async ({ orderId }) => {
				const status = await this.getOrderStatus(orderId);
				return { content: [{ type: "text", text: JSON.stringify({ orderId, status }) }] };
			},
		);
	}
}

export class OrderStore extends DurableObject<Env> {
	async registerOrder(orderId: string, expectedTotalCents: number): Promise<void> {
		await this.ctx.storage.put(`order:${orderId}`, { status: "awaiting_payment", expectedTotalCents });
	}

	async setStatus(orderId: string, status: string): Promise<void> {
		const existing = await this.ctx.storage.get<{ expectedTotalCents: number }>(`order:${orderId}`);
		await this.ctx.storage.put(`order:${orderId}`, { ...existing, status });
	}

	async getStatus(orderId: string): Promise<string | undefined> {
		const existing = await this.ctx.storage.get<{ status: string }>(`order:${orderId}`);
		return existing?.status;
	}

	async getExpectedTotalCents(orderId: string): Promise<number | undefined> {
		const existing = await this.ctx.storage.get<{ expectedTotalCents: number }>(`order:${orderId}`);
		return existing?.expectedTotalCents;
	}
}

async function handleItn(request: Request, env: Env): Promise<Response> {
	const sourceIp = request.headers.get("cf-connecting-ip");
	if (!sourceIp || !isPayfastSourceIp(sourceIp)) {
		return new Response("forbidden", { status: 403 });
	}

	const rawBody = await request.text();
	const params = new URLSearchParams(rawBody);
	const orderedFields: [string, string][] = Array.from(params.entries());
	const fieldMap = Object.fromEntries(orderedFields);

	const config: PayfastConfig = {
		merchantId: env.PAYFAST_MERCHANT_ID,
		merchantKey: env.PAYFAST_MERCHANT_KEY,
		passphrase: env.PAYFAST_PASSPHRASE,
		sandbox: true,
	};

	if (!fieldMap.signature || !(await verifyItnSignature(orderedFields, fieldMap.signature, config))) {
		return new Response("invalid signature", { status: 400 });
	}

	const orderId = fieldMap.m_payment_id;
	const doId = env.ORDER_STORE.idFromName(ORDER_STORE_DO_NAME);
	const doStub = env.ORDER_STORE.get(doId);
	const expectedTotalCents = await doStub.getExpectedTotalCents(orderId);
	if (expectedTotalCents === undefined) {
		return new Response("unknown order", { status: 400 });
	}
	if (!amountsMatch(expectedTotalCents, fieldMap.amount_gross ?? "")) {
		return new Response("amount mismatch", { status: 400 });
	}
	if (!(await confirmWithPayfast(rawBody, config))) {
		return new Response("payfast validate check failed", { status: 400 });
	}

	const status = fieldMap.payment_status === "COMPLETE" ? "confirmed" : "cancelled";
	await doStub.setStatus(orderId, status);
	return new Response("OK", { status: 200 });
}

function htmlPage(title: string, message: string): Response {
	return new Response(
		`<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1><p>${message}</p></body></html>`,
		{ headers: { "content-type": "text/html; charset=utf-8" } },
	);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") return MyMCP.serve("/mcp").fetch(request, env, ctx);
		if (url.pathname === "/webhooks/payfast-itn" && request.method === "POST") return handleItn(request, env);
		if (url.pathname === "/payment-complete") return htmlPage("Thank you!", "Your order is being processed. Check its status back in Claude.");
		if (url.pathname === "/payment-cancelled") return htmlPage("Payment cancelled", "Your payment was cancelled and your order was not placed.");

		return new Response("Not found", { status: 404 });
	},
};
```

## 6. Add Payfast credentials

For local dev, create `.dev.vars` (already gitignored by the template):

```
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=
```

`10000100` / `46f0cd694581a` are Payfast's own public sandbox test merchant
credentials — anyone can use them to test against the sandbox. Swap in your
own sandbox account's credentials if you made one in the prerequisites.

For the deployed Worker, push the same values as secrets (never commit real
credentials to `wrangler.jsonc` or source):

```bash
npx wrangler secret put PAYFAST_MERCHANT_ID
npx wrangler secret put PAYFAST_MERCHANT_KEY
npx wrangler secret put PAYFAST_PASSPHRASE
```

## 7. Deploy

```bash
npx wrangler deploy
```

This prints your live URL, e.g. `https://my-ordering-mcp.<account>.workers.dev`.
Go back to `wrangler.jsonc` (step 4) and set `DEMO_BASE_URL` to that exact
value, then redeploy:

```bash
npx wrangler deploy
```

`DEMO_BASE_URL` is what Payfast redirects/notifies back to, so it must match
the real deployed URL, not `localhost`.

## 8. Connect it to Claude

**Claude Desktop / claude.ai (Settings → Connectors → Add custom connector):**
paste your Worker's `/mcp` URL, e.g.
`https://my-ordering-mcp.<account>.workers.dev/mcp`.

**Claude Code:**

```bash
claude mcp add --transport http my-ordering https://my-ordering-mcp.<account>.workers.dev/mcp
```

Restart the client. You should see `get_menu`, `update_cart`, `checkout`, and
`get_order_status` available as tools.

## 9. Test an end-to-end order

In a Claude conversation using the connector:

1. "What's on the menu?" → calls `get_menu`
2. "Add 2 fries and a cola to my cart" → calls `update_cart`
3. "Check out, I'm [name], my email is [email]" → calls `checkout`, returns a
   Payfast sandbox payment URL
4. Open the URL, pay with a [Payfast sandbox test card](https://developers.payfast.co.za/docs#testing) —
   e.g. card `4000000000000002`, any future expiry, any CVV
5. Payfast's ITN webhook hits `/webhooks/payfast-itn`, verifies the signature,
   re-validates with Payfast, and marks the order `confirmed`
6. Ask Claude "what's the status of my order?" → calls `get_order_status` →
   `confirmed`

## Notes / things to change for production use

- This demo has no auth — anyone with the URL can call the tools. Add auth
  before handling real money or real customer data.
- `sandbox: true` is hardcoded in `payfastConfig()` — switch to `false` and
  use live merchant credentials only once you're ready to take real payments.
- The menu is a static array — wire it to a real menu API/database once you
  have one.
- ITN webhook order lookups here use a single Durable Object instance keyed
  by a fixed name (`orders`) — fine for a demo's order volume; consider
  sharding by order id for higher traffic.
