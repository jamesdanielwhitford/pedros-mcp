// Payfast Custom Integration signature + ITN verification.
// Field order and encoding verified against the official PHP SDK
// (github.com/PayFast/payfast-php-sdk, lib/Auth.php + lib/PaymentIntegrations/Notification.php).

// Field order for the outbound checkout signature. The PHP SDK's own
// generateSignature() actually signs over array_filter()'s output, which
// preserves *caller insertion order* rather than reordering to this list —
// this fixed order only matches because CheckoutFields' key order below
// happens to agree with it. Keep the two in sync if CheckoutFields changes.
const CHECKOUT_SIGNATURE_FIELD_ORDER = [
	"merchant_id",
	"merchant_key",
	"return_url",
	"cancel_url",
	"notify_url",
	"name_first",
	"name_last",
	"email_address",
	"cell_number",
	"m_payment_id",
	"amount",
	"item_name",
	"item_description",
	"custom_int1",
	"custom_str1",
	"email_confirmation",
	"confirmation_address",
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

// PHP urlencode(): spaces as '+', reserved chars as uppercase %XX.
// encodeURIComponent() escapes spaces as %20 and doesn't touch '+', '*', "'",
// "(", ")", "!" the way PHP does — normalize both to match urlencode exactly.
function phpUrlEncode(value: string): string {
	return encodeURIComponent(value)
		.replace(/%20/g, "+")
		.replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

async function md5Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("MD5", data);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
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
	custom_str1?: string; // used to carry the order id back through the round trip
}

export async function buildCheckoutSignature(
	fields: CheckoutFields,
	config: PayfastConfig,
): Promise<string> {
	const merged: Record<string, string> = {
		merchant_id: config.merchantId,
		merchant_key: config.merchantKey,
		...fields,
	};

	let paramString = "";
	for (const key of CHECKOUT_SIGNATURE_FIELD_ORDER) {
		const value = merged[key];
		if (value !== undefined && value !== null && value !== "") {
			paramString += `${key}=${phpUrlEncode(String(value).trim())}&`;
		}
	}
	paramString = paramString.slice(0, -1);

	if (config.passphrase) {
		paramString += `&passphrase=${phpUrlEncode(config.passphrase.trim())}`;
	}

	return md5Hex(paramString);
}

export async function buildCheckoutFormFields(
	fields: CheckoutFields,
	config: PayfastConfig,
): Promise<Record<string, string>> {
	const signature = await buildCheckoutSignature(fields, config);
	return {
		merchant_id: config.merchantId,
		merchant_key: config.merchantKey,
		...fields,
		signature,
	};
}

// Published Payfast ITN source ranges (both live and sandbox use the same set).
const PAYFAST_IP_RANGES = [
	"197.97.145.144/28",
	"41.74.179.192/27",
	"102.216.36.0/28",
	"102.216.36.128/28",
	"144.126.193.139",
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

// Verifies against Cloudflare's CF-Connecting-IP — set by Cloudflare's edge
// from the real TCP source, not forwardable/spoofable by the client itself.
export function isPayfastSourceIp(ip: string): boolean {
	return PAYFAST_IP_RANGES.some((range) =>
		range.includes("/") ? ipv4InCidr(ip, range) : ip.trim() === range,
	);
}

// dataToString: iterate POST fields in arrival order, stop at 'signature',
// keep blanks (unlike the outbound checkout signature, which drops them).
async function itnDataToString(
	fields: [string, string][],
	passphrase: string,
): Promise<string> {
	let paramString = "";
	for (const [key, value] of fields) {
		if (key === "signature") break;
		paramString += `${key}=${phpUrlEncode(value)}&`;
	}
	paramString = paramString.slice(0, -1);

	if (passphrase) {
		paramString += `&passphrase=${phpUrlEncode(passphrase)}`;
	}
	return paramString;
}

export async function verifyItnSignature(
	orderedFields: [string, string][],
	receivedSignature: string,
	config: PayfastConfig,
): Promise<boolean> {
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

// Step 4 of ITN verification: post the same raw body back to Payfast and
// confirm it echoes the literal string "VALID".
export async function confirmWithPayfast(
	rawBody: string,
	config: PayfastConfig,
): Promise<boolean> {
	const response = await fetch(payfastValidateUrl(config), {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: rawBody,
	});
	const text = await response.text();
	return text.trim() === "VALID";
}
