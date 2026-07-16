# Monetize your Model Context Protocol (MCP) app | Stripe Documentation

Source: https://docs.stripe.com/agentic-commerce/apps

---

# Monetize your Model Context Protocol (MCP) app

## Add a checkout flow to your MCP app to accept payments.

Copy for LLMView as Markdown

Use [MCP apps](https://modelcontextprotocol.io/docs/extensions/apps) to expose new capabilities and workflows directly in MCP hosts such as ChatGPT and Claude. Let customers book hotels, order groceries, buy clothes, or complete business workflows without leaving chat. Add a checkout flow to accept payments for one-time purchases, subscriptions, tips, and donations.

## Monetization options

* [Redirect](https://docs.stripe.com/agentic-commerce/apps/accept-payment?platform=web&ui=stripe-hosted): Redirect customers to a prebuilt checkout page in a new browser tab to complete checkout.
* [Instant Checkout](https://docs.stripe.com/agentic-commerce/apps/accept-payment?platform=web&ui=direct-api): Integrate ChatGPT Instant Checkout with Stripe to allow customers to complete checkout without leaving ChatGPT.

## Compare features and availability

|  | [Redirect](https://docs.stripe.com/agentic-commerce/apps/accept-payment?platform=web&ui=stripe-hosted) | [Instant Checkout](https://docs.stripe.com/agentic-commerce/apps/accept-payment?platform=web&ui=direct-api) |
| --- | --- | --- |
| Recommended when | Use a prebuilt, customizable form to collect payments, and you’re comfortable with customers opening a new tab to pay. Offer promo codes, collect tax, localize prices, and create subscriptions with little to no additional code. Suited to common use cases. | Keep customers in the same chat and control the checkout flow. You have resources to build and maintain a custom integration. Suited to complex flows with custom business logic. |
| UI components | Integrated | Custom |
| Availability | Publicly available | OpenAI private beta |
| PCI compliance |  |  |
| Payment methods | [Dynamically display](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods) over [40 payment methods](https://docs.stripe.com/payments/payment-methods/integration-options#choose-how-to-add-payment-methods), and manage them in the [Dashboard](https://dashboard.stripe.com/settings/payment_methods) without code. | Cards, Apple Pay, Google Pay, and [Link](https://docs.stripe.com/payments/link) |
| Save payment methods for future use |  |  |
| 3DS |  |  |
| Subscriptions |  |  |
| Free trials | Integrated | Requires API integration |
| Promo codes & discounts | Integrated | Requires API integration |
| Tax | Integrated | Requires API integration |
| Upsells and cross-sells | Integrated | Requires API integration |
