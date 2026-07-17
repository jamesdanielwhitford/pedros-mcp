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

interface PedrosState {
	cart: CartLine[];
	orders: Record<string, Order>;
}

// ITN handlers run in the plain Worker fetch handler, outside any McpAgent
// instance, so confirmed order state is kept here too (Durable Object storage
// keyed by order id) rather than only inside a single session's Agent state —
// the customer's MCP session and the ITN webhook are different requests.
const ORDER_STORE_DO_NAME = "pedros-orders";

function centsToAmountString(cents: number): string {
	return (cents / 100).toFixed(2);
}

function generateId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID()}`;
}

export class MyMCP extends McpAgent<Env, PedrosState> {
	server = new McpServer({
		name: "Pedro's Ordering (Demo)",
		version: "0.1.0",
	});

	initialState: PedrosState = {
		cart: [],
		orders: {},
	};

	private supportsUrlElicitation(): boolean {
		const capabilities = this.server.server.getClientCapabilities();
		return Boolean(capabilities?.elicitation?.url);
	}

	private payfastConfig(): PayfastConfig {
		return {
			merchantId: this.env.PAYFAST_MERCHANT_ID,
			merchantKey: this.env.PAYFAST_MERCHANT_KEY,
			passphrase: this.env.PAYFAST_PASSPHRASE,
			sandbox: true,
		};
	}

	// URL-mode elicitation isn't exposed by the SDK's elicitInput() helper
	// (it only builds form-mode requests) — send the raw JSON-RPC request the
	// same way that helper does internally, so the checkout tool can point
	// the customer at Payfast's hosted payment page.
	private async elicitUrl(
		message: string,
		url: string,
		timeoutMs: number,
	): Promise<{ action: "accept" | "decline" | "cancel"; content?: unknown }> {
		const requestId = `elicit_${crypto.randomUUID()}`;
		const elicitationId = crypto.randomUUID();
		const elicitRequest = {
			jsonrpc: "2.0" as const,
			id: requestId,
			method: "elicitation/create",
			params: { mode: "url" as const, message, elicitationId, url },
		};

		// _pendingElicitations / _transport are private in the McpAgent .d.ts but
		// are the same fields the SDK's own form-mode elicitInput() reads/writes
		// on the compiled class at runtime — reused here to add url-mode support,
		// which elicitInput() itself doesn't build (agents@0.17.4).
		const self = this as unknown as {
			_pendingElicitations: Map<string, { resolve: (r: unknown) => void; reject: (e: Error) => void }>;
			_transport?: { send: (message: unknown) => Promise<void> };
		};

		return this.keepAliveWhile(async () => {
			const responsePromise = new Promise<{
				action: "accept" | "decline" | "cancel";
				content?: unknown;
			}>((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					self._pendingElicitations.delete(requestId);
					reject(new Error("Elicitation request timed out"));
				}, timeoutMs);
				self._pendingElicitations.set(requestId, {
					resolve: (result: unknown) => {
						clearTimeout(timeoutId);
						self._pendingElicitations.delete(requestId);
						resolve(result as { action: "accept" | "decline" | "cancel"; content?: unknown });
					},
					reject: (err: Error) => {
						clearTimeout(timeoutId);
						self._pendingElicitations.delete(requestId);
						reject(err);
					},
				});
			});

			if (self._transport) {
				await self._transport.send(elicitRequest);
			}
			return responsePromise;
		});
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
			{
				title: "Get Pedro's menu",
				description:
					"List available menu items with prices (demo: Pedro's real menu items, not a live call to Pedro's menu API).",
				inputSchema: {},
			},
			async () => ({
				content: [
					{
						type: "text",
						text: JSON.stringify(
							MENU.map((item) => ({
								id: item.id,
								name: item.name,
								category: item.category,
								price: centsToAmountString(item.priceCents),
								...(item.isNew ? { new: true } : {}),
							})),
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
				description:
					"Add, remove, or change the quantity of a menu item in the current order. Set quantity to 0 to remove an item. Returns the updated cart and total.",
				inputSchema: {
					itemId: z.string().describe("Menu item id from get_menu"),
					quantity: z.number().int().min(0).describe("Desired quantity, 0 removes the item"),
				},
			},
			async ({ itemId, quantity }) => {
				const menuItem = findMenuItem(itemId);
				if (!menuItem) {
					return {
						content: [{ type: "text", text: `Unknown menu item id: ${itemId}` }],
						isError: true,
					};
				}

				const cart = this.state.cart.filter((line) => line.itemId !== itemId);
				if (quantity > 0) {
					cart.push({
						itemId: menuItem.id,
						name: menuItem.name,
						priceCents: menuItem.priceCents,
						quantity,
					});
				}
				this.setState({ ...this.state, cart });

				const totalCents = cart.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									cart: cart.map((line) => ({
										itemId: line.itemId,
										name: line.name,
										quantity: line.quantity,
										lineTotal: centsToAmountString(line.priceCents * line.quantity),
									})),
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
				description:
					"Create a Payfast payment session for the current cart and wait for payment confirmation. Returns 'confirmed' if Payfast's ITN webhook arrives in time, otherwise 'pending' as a fallback (poll get_order_status afterward). If the response includes a paymentUrl, the client doesn't support in-chat payment prompts — share that URL with the customer so they can pay directly.",
				inputSchema: {
					customerName: z.string().describe("Customer's first name, for the Payfast form"),
					customerEmail: z.string().email().describe("Customer's email, for the Payfast form and receipt"),
				},
			},
			async ({ customerName, customerEmail }) => {
				if (this.state.cart.length === 0) {
					return {
						content: [{ type: "text", text: "Cart is empty — add items with update_cart before checking out." }],
						isError: true,
					};
				}

				const orderId = generateId("order");
				const totalCents = this.state.cart.reduce(
					(sum, line) => sum + line.priceCents * line.quantity,
					0,
				);
				const order: Order = {
					id: orderId,
					lines: [...this.state.cart],
					totalCents,
					status: "awaiting_payment",
				};
				this.setState({
					...this.state,
					cart: [],
					orders: { ...this.state.orders, [orderId]: order },
				});

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
						item_name: "Pedro's order",
						item_description: itemNames,
						custom_str1: orderId,
					},
					this.payfastConfig(),
				);

				const checkoutUrl = `${payfastProcessUrl(this.payfastConfig())}?${new URLSearchParams(formFields).toString()}`;

				let elicitResult: { action: string } | undefined;
				if (this.supportsUrlElicitation()) {
					try {
						elicitResult = await this.elicitUrl(
							`Complete payment for order ${orderId} (R${centsToAmountString(totalCents)}) with Pedro's Sandbox checkout.`,
							checkoutUrl,
							15_000,
						);
					} catch {
						// timeout — fall through to pending, same as a slow ITN
					}

					if (elicitResult?.action === "decline" || elicitResult?.action === "cancel") {
						const cancelled: Order = { ...order, status: "cancelled" };
						this.setState({
							...this.state,
							orders: { ...this.state.orders, [orderId]: cancelled },
						});
						await doStub.setStatus(orderId, "cancelled");
						return {
							content: [{ type: "text", text: JSON.stringify({ orderId, status: "cancelled" }) }],
						};
					}
				}

				// Held open pending Payfast's ITN, capped so the tool call doesn't
				// block indefinitely if the customer is slow to pay or ITN lags.
				const deadline = Date.now() + 15_000;
				let status = await this.getOrderStatus(orderId);
				while (status === "awaiting_payment" && Date.now() < deadline) {
					await new Promise((resolve) => setTimeout(resolve, 1_000));
					status = await this.getOrderStatus(orderId);
				}

				if (status === "confirmed") {
					const confirmed: Order = { ...order, status: "confirmed" };
					this.setState({
						...this.state,
						orders: { ...this.state.orders, [orderId]: confirmed },
					});
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								orderId,
								status: status === "not_found" ? "awaiting_payment" : status,
								total: centsToAmountString(totalCents),
								...(elicitResult ? {} : { paymentUrl: checkoutUrl }),
							}),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"get_order_status",
			{
				title: "Get order status",
				description: "Check the latest status of a previously placed order by id.",
				inputSchema: { orderId: z.string() },
			},
			async ({ orderId }) => {
				const status = await this.getOrderStatus(orderId);
				return { content: [{ type: "text", text: JSON.stringify({ orderId, status }) }] };
			},
		);
	}
}

// Durable Object holding order status, keyed by order id, reachable both from
// an MCP session (checkout / get_order_status) and the plain ITN webhook
// route below — those are two different Workers requests, so status can't
// live only inside one McpAgent session's state.
export class OrderStore extends DurableObject<Env> {
	async registerOrder(orderId: string, expectedTotalCents: number): Promise<void> {
		await this.ctx.storage.put(`order:${orderId}`, {
			status: "awaiting_payment",
			expectedTotalCents,
		});
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

	const signature = fieldMap.signature;

	const config: PayfastConfig = {
		merchantId: env.PAYFAST_MERCHANT_ID,
		merchantKey: env.PAYFAST_MERCHANT_KEY,
		passphrase: env.PAYFAST_PASSPHRASE,
		sandbox: true,
	};

	if (!signature || !(await verifyItnSignature(orderedFields, signature, config))) {
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
	const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f7f4f0; color: #2b2320; }
  main { text-align: center; padding: 2rem; }
  h1 { margin-bottom: 0.5rem; }
</style>
</head>
<body>
<main>
<h1>${title}</h1>
<p>${message}</p>
</main>
</body>
</html>`;
	return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		if (url.pathname === "/webhooks/payfast-itn" && request.method === "POST") {
			return handleItn(request, env);
		}

		if (url.pathname === "/payment-complete") {
			return htmlPage("Thank you!", "Your order is being processed. You can check its status back in Claude.");
		}

		if (url.pathname === "/payment-cancelled") {
			return htmlPage("Payment cancelled", "Your payment was cancelled and your order was not placed.");
		}

		return new Response("Not found", { status: 404 });
	},
};
