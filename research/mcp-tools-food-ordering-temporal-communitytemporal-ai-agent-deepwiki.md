# MCP Tools (Food Ordering) | temporal-community/temporal-ai-agent | DeepWiki

Source: https://deepwiki.com/temporal-community/temporal-ai-agent/5.5-mcp-tools-(food-ordering)

---

Relevant source files

## Purpose and Scope

This document details the food ordering use case, which serves as a comprehensive example of Model Context Protocol (MCP) integration within the Temporal AI Agent system. The food ordering agent demonstrates how to combine native Python tools with external MCP server tools (Stripe) to create a complete e-commerce workflow.

This page focuses on the specific implementation of food ordering tools and Stripe integration. For general MCP architecture and client management, see [MCP Integration](https://deepwiki.com/temporal-community/temporal-ai-agent/2.5-mcp-integration). For other tool domains, see [Tool Domains](https://deepwiki.com/temporal-community/temporal-ai-agent/5-tool-domains).

## Overview

The food ordering system implements a restaurant ordering workflow called "Tony's Pizza Palace" that enables users to:

* Browse menu items with images
* Check pricing
* Add items to a shopping cart
* Create customer profiles
* Generate and finalize invoices for payment

This workflow combines a **native tool** (`AddToCart`) for cart management with **Stripe MCP server tools** for payment processing (`list_products`, `list_prices`, `create_customer`, `create_invoice`, `create_invoice_item`, `finalize_invoice`).

**Sources:** [goals/food.py1-84](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L1-L84)

## Goal Definition

### goal\_food\_ordering Configuration

The `goal_food_ordering` agent is defined in [goals/food.py9-80](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L9-L80) with the following configuration:

| Property | Value |
| --- | --- |
| **id** | `"goal_food_ordering"` |
| **category\_tag** | `"food"` |
| **agent\_name** | `"Food Ordering Assistant"` |
| **tools** | `[food_add_to_cart_tool]` (native) |
| **mcp\_server\_definition** | Stripe MCP server with filtered tools |

The goal includes a detailed `example_conversation_history` that demonstrates the complete ordering workflow, showing proper sequencing of tool calls and expected responses.

**Sources:** [goals/food.py9-80](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L9-L80)

**Sources:** [goals/food.py14-24](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L14-L24) [workflows/workflow\_helpers.py23-36](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L23-L36) [tools/tool\_registry.py404-434](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tools/tool_registry.py#L404-L434)

The `is_mcp_tool()` function determines routing logic:

The logic at [workflows/workflow\_helpers.py23-36](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L23-L36) first checks if the goal has an MCP server definition. If so, it attempts to look up the tool in the native tool registry. If the lookup fails (raises `ValueError`), the tool is classified as an MCP tool.

**Sources:** [workflows/workflow\_helpers.py23-36](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L23-L36) [tests/test\_mcp\_integration.py69-96](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L69-L96)

The `food_add_to_cart_tool` is defined in [tools/tool\_registry.py404-434](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tools/tool_registry.py#L404-L434):

| Argument | Type | Description |
| --- | --- | --- |
| `customer_email` | string | Email address of the customer |
| `item_name` | string | Name of the menu item (e.g., 'Margherita Pizza', 'Caesar Salad') |
| `item_price` | number | Price of the item in dollars (e.g., 14.99) |
| `quantity` | number | Quantity of the item to add (defaults to 1) |
| `stripe_product_id` | string | Stripe product ID for reference (optional) |

### Purpose and Usage

The `AddToCart` tool serves as a stateful cart management layer between menu browsing and checkout. It accumulates items locally before the actual Stripe invoice is created. This design allows users to:

1. Add multiple items to their order
2. Review their cart before committing
3. Modify quantities without making API calls to Stripe for each change

The tool is called after the user has browsed the menu (`list_products`) and checked prices (`list_prices`), as shown in the example conversation at [goals/food.py48-54](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L48-L54)

**Sources:** [tools/tool\_registry.py404-434](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tools/tool_registry.py#L404-L434) [goals/food.py25-31](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L25-L31)

## Stripe MCP Server Integration

### Server Definition

The Stripe MCP server is configured via `get_stripe_mcp_server_definition()` in [goals/food.py15-24](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L15-L24):

The `included_tools` parameter filters the available Stripe API to only the operations needed for food ordering. This prevents the LLM from accessing unrelated Stripe functionality like subscriptions or payment methods.

**Sources:** [goals/food.py15-24](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L15-L24)

When the workflow starts, it dynamically loads MCP tool definitions:

The `create_mcp_tool_definitions()` function at [tools/tool\_registry.py439-472](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tools/tool_registry.py#L439-L472) converts MCP tool schemas into `ToolDefinition` objects that the LLM can understand:

**Sources:** [tools/tool\_registry.py439-472](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tools/tool_registry.py#L439-L472) [tests/test\_mcp\_integration.py142-211](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L142-L211)

## Food Ordering Workflow

### Complete Order Flow

**Sources:** [goals/food.py33-78](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L33-L78)

### Key Workflow Details

The goal description at [goals/food.py26-27](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L26-L27) instructs the agent to display images using markdown:

```
"If menu items contain links to images, you can use markdown to display them
e.g. ![Pepperoni Pizza](https://...)"
```

The example conversation demonstrates this at [goals/food.py39](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L39-L39) where the agent renders menu items with inline images.

#### 2. Multiple Item Handling

A critical detail in the invoice creation phase is that `create_invoice_item` **does not accept a quantity parameter**. The goal description explicitly notes at [goals/food.py30-31](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L30-L31):

```
"IMPORTANT: create_invoice_item does NOT accept quantity parameter - call it once
per item, so if user wants 2 pizzas, call create_invoice_item twice with the same price"
```

This is demonstrated in the example conversation at [goals/food.py66-72](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L66-L72) where two separate `create_invoice_item` calls are made for two pizzas.

#### 3. Invoice Due Date Default

The workflow includes a safeguard for the `days_until_due` parameter. At [workflows/workflow\_helpers.py61-62](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L61-L62):

This ensures that invoices created through the MCP server have a valid due date, which Stripe requires when `collection_method` defaults to `send_invoice`. Without this, invoice creation would fail.

**Sources:** [goals/food.py26-31](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L26-L31) [workflows/workflow\_helpers.py59-62](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L59-L62) [tests/test\_mcp\_integration.py316-416](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L316-L416)

When an MCP tool is confirmed for execution, the workflow follows this path:

At [workflows/workflow\_helpers.py52-75](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L52-L75) the MCP execution branch:

1. Copies tool arguments
2. Adds `server_definition` to the args dict
3. Applies `days_until_due=7` default for `create_invoice` tool
4. Executes the activity with MCP-specific summary and retry policy

**Sources:** [workflows/workflow\_helpers.py39-103](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L39-L103)

### Argument Type Conversion

MCP tools may receive arguments as strings from the LLM that need type coercion. The `_convert_args_types()` function handles this conversion:

| String Input | Converted Type | Example |
| --- | --- | --- |
| `"5"` | `int` | `5` |
| `"12.5"` | `float` | `12.5` |
| `"true"` / `"false"` | `bool` | `True` / `False` |
| `"pizza"` | `str` | `"pizza"` |

Tests at [tests/test\_mcp\_integration.py51-66](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L51-L66) verify this conversion works correctly for mixed argument types.

**Sources:** [tests/test\_mcp\_integration.py51-66](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L51-L66)

## Testing MCP Integration

### Test Coverage

The test file [tests/test\_mcp\_integration.py](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py) provides comprehensive coverage of MCP functionality:

| Test | Purpose | Key Assertions |
| --- | --- | --- |
| `test_convert_args_types_basic` | Verify type coercion | String-to-int, string-to-float, string-to-bool |
| `test_is_mcp_tool_identification` | Verify tool routing | Native tools return False, MCP tools return True |
| `test_mcp_list_tools_success` | Verify dynamic tool loading | Tools loaded and filtered correctly |
| `test_workflow_loads_mcp_tools_dynamically` | End-to-end tool loading | MCP tools added to goal during workflow startup |
| `test_mcp_tool_execution_flow` | Verify MCP execution | `server_definition` passed to activity |
| `test_create_invoice_defaults_days_until_due` | Verify default parameters | `days_until_due=7` added when missing |
| `test_mcp_tool_failure_recorded` | Verify error handling | Failures recorded in conversation history |

The test at [tests/test\_mcp\_integration.py142-211](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L142-L211) verifies that when a workflow starts with an MCP server definition, it automatically loads the available tools:

This ensures that MCP tools are available to the LLM without manual registration.

**Sources:** [tests/test\_mcp\_integration.py1-522](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L1-L522)

## Configuration and Environment

The Stripe MCP server connection is configured through environment variables (see [Configuration](https://deepwiki.com/temporal-community/temporal-ai-agent/3-configuration)). The server definition typically includes:

* **Command**: Path to the MCP server executable
* **Arguments**: Server-specific arguments (e.g., API keys, modes)
* **Environment Variables**: Additional configuration passed to the server process

For food ordering specifically, the Stripe test mode is typically used with test API keys to enable safe demonstration without real payment processing.

**Sources:** [goals/food.py15-24](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/goals/food.py#L15-L24)

## Error Handling

When an MCP tool fails, the error is captured and recorded in the conversation history at [workflows/workflow\_helpers.py98-100](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L98-L100):

The test at [tests/test\_mcp\_integration.py419-521](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L419-L521) verifies that failures are properly recorded, allowing the LLM to understand what went wrong and potentially retry or inform the user.

### Connection Issues

MCP connection failures during tool listing are handled gracefully. The `mcp_list_tools` activity returns an error structure:

This allows the workflow to continue even if the MCP server is temporarily unavailable.

**Sources:** [workflows/workflow\_helpers.py98-103](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/workflows/workflow_helpers.py#L98-L103) [tests/test\_mcp\_integration.py122-138](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L122-L138) [tests/test\_mcp\_integration.py419-521](https://github.com/temporal-community/temporal-ai-agent/blob/3180084e/tests/test_mcp_integration.py#L419-L521)
