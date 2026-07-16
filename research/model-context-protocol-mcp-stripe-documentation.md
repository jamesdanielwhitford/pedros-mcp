# Model Context Protocol (MCP) | Stripe Documentation

Source: https://docs.stripe.com/mcp

---

[Public preview](https://docs.stripe.com/release-phases)

## Let your AI agents interact with the Stripe API by using our MCP server.

Copy for LLMView as Markdown

The Stripe Model Context Protocol (MCP) server provides a set of tools that AI agents can use to interact with the Stripe API and search our knowledge base (including documentation and support articles).

## Connect to Stripe’s MCP server

[Install in Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=stripe&config=eyJ1cmwiOiJodHRwczovL21jcC5zdHJpcGUuY29tIn0%3D)

To open Cursor and automatically add the Stripe MCP, click install. Alternatively, add the following to your `~/.cursor/mcp.json` file. To learn more, see the Cursor [documentation](https://docs.cursor.com/context/model-context-protocol).

After installing, you can manage MCP client sessions in your Dashboard settings.

### Manage MCP client sessions

### Building autonomous agents

The server exposes the following [MCP tools](https://modelcontextprotocol.io/docs/concepts/tools). We recommend enabling human confirmation of tools and exercising caution when using the Stripe MCP with other servers to avoid prompt injection attacks. If you have feedback or want to see more tools, email us at [mcp@stripe.com](mailto:mcp@stripe.com).

| Resource | Tool | Description |
| --- | --- | --- |
| **API tools** | `stripe_api_search` | Search for Stripe API methods by keyword |
| `stripe_api_details` | Get detailed parameter information for a specific Stripe API method. |
| `stripe_api_read` | Read data with any Stripe API `GET` method |
| `stripe_api_write` | Write data with any Stripe API `POST`, `PATCH`, `PUT` and `DELETE` method |
| **Account** | `get_stripe_account_info` | [Retrieve account](https://docs.stripe.com/api/accounts/retrieve) |
| **Refund** | `create_refund` | [Create refund](https://docs.stripe.com/api/refunds/create) |
| **Others** | `search_stripe_resources` | [Search Stripe resources](https://docs.stripe.com/search) |
| `fetch_stripe_resources` | Fetch Stripe object |
| `search_stripe_documentation` | Search the Stripe documentation for the given question and language |
| `stripe_implementation_planner` | Guides the user through Stripe products to help users accept payments, sell products online, set up billing, or build any Stripe integration |
| `send_stripe_mcp_feedback` | Submit feedback from user or agent about Stripe’s MCP server tools |
| `stripe_report` | Search, retrieve and create reports and report runs |

The Stripe MCP server exposes multiple APIs that you can call with the `stripe_api_read` and `stripe_api_write` tools. This access makes much of the API available through MCP without increasing the context window unnecessarily.

## Support for connected accounts

Connect platforms can make MCP calls as their connected accounts. However, you can’t use OAuth. Instead, use [restricted access keys](https://docs.stripe.com/keys/restricted-api-keys#create-a-restricted-api-key) with the appropriate Connect permissions.

To make an MCP call as a connected account, pass the `Stripe-Account` header. This is useful when you provide an agent that allows your connected accounts to make MCP calls through your platform.

```
{
  "mcpServers": {
    "stripe": {
      "url": "https://mcp.stripe.com",
      "headers": {
         "Authorization": "Bearer rk_.....",
         "Stripe-Account": "acct_xxxxxxxxx"
      }
    }
  }
}
```

## Agentic finance with Treasury

You can extend the Stripe MCP server with Treasury tools that let your AI agent move money, pay bills, and create and manage cards.

Interested in agentic finance with Treasury?

Enter your email to request access.
