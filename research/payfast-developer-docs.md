Source: https://developers.payfast.co.za/docs
Fetched via: claude-in-chrome (get_page_text) — WebFetch returned only a JS shell for this site

# PayFast Developer Documentation (key excerpts)

## Integration methods offered
- **Custom Integration**: Build your own checkout form (HTML form with hidden inputs), POST to Payfast, customer is redirected to Payfast's hosted payment page to enter card/EFT/wallet details, then redirected back.
- **APIs**: Server-to-server integration (Authentication, Error handling, Recurring Billing endpoints).
- **Onsite Payments (Beta)**: Payfast's payment engine loads in a JS modal directly on the merchant's own page (no redirect away from the site) — but the actual card entry still happens inside Payfast's iframe/modal, not in the merchant's own form fields.
- **Recurring Billing**: Subscriptions and Tokenization (card-on-file, charged later via API).
- Additional: Pay Now button generator, Shopping cart plugins (WooCommerce etc.)

## Custom Integration flow
1. Merchant builds an HTML form with hidden inputs: `merchant_id`, `merchant_key`, `return_url`, `cancel_url`, `notify_url`, customer details (`name_first`, `name_last`, `email_address`, `cell_number`), transaction details (`m_payment_id`, `amount`, `item_name`, `item_description`, custom pass-through fields), and optional `payment_method` (e.g. `cc`, `ef`, `ap` for Apple Pay, `gp` for Google Pay, etc.)
2. Generate an MD5 `signature` over the concatenated non-blank fields (in the documented field order) + a merchant passphrase (salt).
3. POST/redirect the customer's browser to Payfast's hosted page:
   - Live: `https://www.payfast.co.za/eng/process`
   - Sandbox: `https://sandbox.payfast.co.za/eng/process`
4. Payfast sends an **Instant Transaction Notification (ITN)** server-to-server POST to the merchant's `notify_url` before returning the customer to `return_url`.

## Onsite Payments (Beta)
- Requires HTTPS.
- Step 1: POST the same transaction/customer fields + `signature` server-to-server to `https://www.payfast.co.za/onsite/process` (sandbox: `https://sandbox.payfast.co.za/onsite/process`). Response: `{"uuid": "123-abc"}`.
- Step 2: Include `https://www.payfast.co.za/onsite/engine.js` on the page and call `window.payfast_do_onsite_payment({"uuid":"123-abc"}, callback)` to trigger a payment modal in-page. Merchant never touches card data directly — it's entered inside Payfast's own modal/iframe.
- Payment confirmation still arrives via the same `notify_url` ITN mechanism.

## ITN (webhook) verification — 4 required checks
Per the docs, on receiving a notification at `notify_url` you must:
1. **Verify the signature** — recompute MD5 hash of posted fields (+passphrase) and compare to the `signature` field.
2. **Verify the source IP/domain** — confirm the request came from a valid Payfast host (`www.payfast.co.za`, `sandbox.payfast.co.za`, `w1w.payfast.co.za`, `w2w.payfast.co.za`) — Payfast also publishes static IP ranges to whitelist (e.g. `197.97.145.144/28`, `41.74.179.192/27`, `102.216.36.0/28`, `102.216.36.128/28`, `144.126.193.139`).
3. **Compare payment data** — the `amount_gross` in the notification must match what you expected to charge (abs diff ≤ 0.01).
4. **Server confirmation** — POST the same param string back to Payfast's validate endpoint and confirm it returns the literal string `VALID`:
   - Live: `https://www.payfast.co.za/eng/query/validate`
   - Sandbox: `https://sandbox.payfast.co.za/eng/query/validate`

Must return HTTP 200 quickly or Payfast retries (immediately, then after 10 min, then exponential backoff).

ITN payload includes: `m_payment_id`, `pf_payment_id`, `payment_status` (`COMPLETE`/`CANCELLED`), `item_name`, `item_description`, `amount_gross`, `amount_fee`, `amount_net`, custom pass-through fields, customer details, `merchant_id`, `signature`, and for recurring: `token`, `billing_date`.

Ports used for ITN: 80, 8080, 8081, 443.

## PCI compliance (direct from docs)
> "Payfast is PCI DSS level 1 compliant... Outsourcing your card payments to Payfast means you do not have to be concerned about the laborious process of being PCI compliant, and can rest assured in the knowledge that card information is handled securely."

This confirms: the merchant should **never** collect/handle raw card numbers themselves. Card entry happens on Payfast's hosted page (Custom Integration) or inside Payfast's own modal (Onsite Payments) — both keep card data out of the merchant's systems/PCI scope.

## Sandbox / testing
- Sandbox is a full duplicate of production: `https://sandbox.payfast.co.za`
- Test credentials given in docs: Merchant ID `10000100`, Merchant Key `46f0cd694581a`, Passphrase `jt7NOE43FZPn`
- Sandbox test buyer login: `sbtu01@payfast.io` / `clientpass`
- Sandbox uses a dummy wallet (reset to R99,999,999.99 nightly) instead of real payment methods; ITNs are sent once and viewable in the Sandbox dashboard.
- Live minimum transaction amount: ZAR 5.00.

## Recurring Billing (relevant if Pedro's wants saved cards / repeat customers)
- **Subscriptions**: fixed schedule (`frequency`, `cycles`, `recurring_amount`), Payfast auto-charges.
- **Tokenization**: card-on-file, merchant charges via API "when instructed" — this is the relevant one for an ordering agent that wants to let a returning customer skip re-entering card details, since new charges are triggered by an API call using a stored `token` rather than a full checkout redirect each time.
- Recurring Billing requires a passphrase to be set on the account (mandatory in the signature).

## SDKs
- Official PHP SDK on GitHub covers Custom Integration, Onsite Integration, and all APIs.
- No first-party Node/Python SDK was surfaced on this page — third-party wrappers exist on npm/PyPI but aren't officially maintained by Payfast (unverified reliability).
