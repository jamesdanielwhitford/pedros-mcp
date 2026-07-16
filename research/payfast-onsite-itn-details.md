# Payfast Onsite Payments + ITN — verification pass

Source: https://developers.payfast.co.za/docs
Fetched via: `better-research` fetch (requests → auto-fallback to Playwright, since the page is a single-page app). Also attempted with URL fragments (`#onsite-payments`, `#notifications`) to target specific sections directly.

## Outcome: confirms the existing summary, doesn't add new field-level detail

This was meant to go deeper than the original `research/payfast-developer-docs.md` (which was fetched via claude-in-chrome after WebFetch hit a JS-shell wall). The `better-research` skill's Playwright fallback loaded the page and extracted readable content via `readability-lxml`, but developers.payfast.co.za/docs is a single-page app whose content is organized into JS-driven tabs/anchors rather than separate crawlable URLs — the `#onsite-payments` and `#notifications` fragments both returned the same generic page shell (~1,800 characters), not the deeper per-section reference content visible when a human clicks through the tabs in a real browser.

What *did* come through was one PHP code sample matching the already-documented Onsite Payments flow: a `generatePaymentIdentifier()` helper that builds the signed parameter string and POSTs it via cURL to `https://www.payfast.co.za/onsite/process`, parses the JSON response, and returns the `uuid` field on success. This is a **direct confirmation** of the two already-recorded facts in `research/payfast-developer-docs.md`:
- Step 1 of Onsite Payments is a server-to-server POST of the signed transaction fields to `/onsite/process`.
- The response is JSON containing a `uuid`, which is then handed to the client-side JS engine (`window.payfast_do_onsite_payment`) to open the in-page modal.

No new field names, response schema details, or ITN payload specifics were surfaced beyond what the original research already captured (signature/passphrase generation, the 4 ITN verification checks, the `notify_url` mechanics, `payment_status` values, IP allowlist, validate-endpoint round-trip).

## What's still not independently verified

The original file's level of detail (exact ITN field list, IP ranges, retry/backoff timing, port numbers) came from claude-in-chrome reading the live rendered docs, not from a scraped static page — this session's attempt couldn't independently re-verify those specifics against fetched text, since the SPA won't render its full tabbed content through `requests` or headless Playwright with a `domcontentloaded` wait. Treat the original file's specifics as **directional but not independently re-confirmed at the field level** — if exact request/response shapes become load-bearing for actual implementation (e.g. writing the real signature-generation code), re-verify by paging through the live docs interactively (claude-in-chrome, as done originally) or against the official PayFast PHP SDK source on GitHub, which will have the authoritative parameter names in code rather than prose.

## No architecture impact

Nothing here changes or challenges the proposed architecture — this was a verification attempt, and it came back confirming (not contradicting) what was already known. The Payfast integration choice (Custom redirect vs. Onsite modal) and the ITN confirmation mechanism are exactly as already documented in `research/payfast-developer-docs.md`.
