# MCP connector - Claude Platform Docs

Source: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector

---

Messages/MCP

Connect to remote MCP servers directly from the Messages API without an MCP client, and allowlist, denylist, or configure individual tools.

Claude's Model Context Protocol (MCP) connector feature enables you to connect to remote MCP servers directly from the Messages API without a separate MCP client.



**Current version:** This feature requires the beta header: `"anthropic-beta": "mcp-client-2025-11-20"`

The previous version (`mcp-client-2025-04-04`) is deprecated. See [Deprecated version: mcp-client-2025-04-04](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector#deprecated-version-mcp-client-2025-04-04).



This feature is **not** eligible for [Zero Data Retention (ZDR)](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention). Data is retained according to the feature's standard retention policy.

##

* **Direct API integration**: Connect to MCP servers without implementing an MCP client
* **Tool calling support**: Access MCP tools through the Messages API
* **Flexible tool configuration**: Enable all tools, allowlist specific tools, or denylist unwanted tools
* **Per-tool configuration**: Configure individual tools with custom settings
* **OAuth authentication**: Support for OAuth Bearer tokens for authenticated servers
* **Multiple servers**: Connect to multiple MCP servers in a single request

##

Once an MCP server is connected, Claude calls its tools when the user's request maps to a tool's described capability, either explicitly ("search Jira for open bugs") or implicitly ("what's blocking the release?" with a Jira server attached).

Claude does **not** call an MCP tool for general knowledge questions about a connected service. Asking "how do Notion databases work?" with a Notion server attached is answered directly; asking "what's in my Projects database?" triggers the tool.

You can steer how readily Claude calls MCP tools through your system prompt. See [When Claude uses tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview#when-claude-uses-tools) for general guidance and example phrasings.

##

* Of the feature set of the [MCP specification](https://modelcontextprotocol.io/introduction#explore-mcp), only [tool calls](https://modelcontextprotocol.io/docs/concepts/tools) are currently supported.
* The server must be publicly exposed through HTTP (supports both Streamable HTTP and SSE transports). Local STDIO servers cannot be connected directly.
* The MCP connector is available on the Claude API, [Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws), and [Microsoft Foundry](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry). On Microsoft Foundry, the MCP connector requires a [Hosted on Anthropic deployment](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry#additional-features-not-supported-when-hosted-on-azure). It is not currently available on Amazon Bedrock or Google Cloud.

##  Using the MCP connector in the Messages API

The MCP connector uses two components:

1. **MCP Server Definition** (`mcp_servers` array): Defines server connection details (URL, authentication)
2. **MCP Toolset** (`tools` array): Configures which tools to enable and how to configure them

###

This example enables all tools from an MCP server with default configuration:

cURLCLIPythonTypeScriptC#GoJavaPHPRuby



```
client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-opus-4-8",
    max_tokens=1000,
    messages=[{"role": "user", "content": "What tools do you have available?"}],
    mcp_servers=[
        {
            "type": "url",
            "url": "https://example-server.modelcontextprotocol.io/sse",
            "name": "example-mcp",
            "authorization_token": "YOUR_TOKEN",
        }
    ],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "example-mcp"}],
    betas=["mcp-client-2025-11-20"],
)

print(response)
```

##  MCP server configuration

Each MCP server in the `mcp_servers` array defines the connection details:

```
{
  "type": "url",
  "url": "https://example-server.modelcontextprotocol.io/sse",
  "name": "example-mcp",
  "authorization_token": "YOUR_TOKEN"
}
```



###

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | Yes | Currently only "url" is supported. |
| `url` | string | Yes | The URL of the MCP server. Must start with https://. |
| `name` | string | Yes | A unique identifier for this MCP server. Must be referenced by exactly one MCPToolset in the `tools` array. |
| `authorization_token` | string | No | OAuth authorization token if required by the MCP server. See [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization). |

##

The MCPToolset lives in the `tools` array and configures which tools from the MCP server are enabled and how they should be configured.

###

```
{
  "type": "mcp_toolset",
  "mcp_server_name": "example-mcp",
  "default_config": {
    "enabled": true,
    "defer_loading": false
  },
  "configs": {
    "specific_tool_name": {
      "enabled": true,
      "defer_loading": true
    }
  }
}
```



###

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | Yes | Must be "mcp\_toolset". |
| `mcp_server_name` | string | Yes | Must match a server name defined in the `mcp_servers` array. |
| `default_config` | object | No | Default configuration applied to all tools in this set. Individual tool configs in `configs` override these defaults. |
| `configs` | object | No | Per-tool configuration overrides. Keys are tool names, values are configuration objects. |
| `cache_control` | object | No | [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) cache breakpoint configuration for this toolset. |

###

Each tool (whether configured in `default_config` or in `configs`) supports the following fields:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | Whether this tool is enabled. |
| `defer_loading` | boolean | `false` | If true, tool description is not sent to the model initially. Used with [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool). |

For the full directory of Anthropic-provided tools and optional properties such as `defer_loading`, see the [Tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference). For searching across large tool sets, see [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool).

###

Configuration values merge with this precedence (highest to lowest):

1. Tool-specific settings in `configs`
2. Set-level `default_config`
3. System defaults

Example:

```
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-calendar-mcp",
  "default_config": {
    "defer_loading": true
  },
  "configs": {
    "search_events": {
      "enabled": false
    }
  }
}
```



Results in:

* `search_events`: `enabled: false` (from configs), `defer_loading: true` (from default\_config)
* All other tools: `enabled: true` (system default), `defer_loading: true` (from default\_config)

##  Common configuration patterns

###

The simplest pattern - enable all tools from a server:

```
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-calendar-mcp"
}
```



###

Set `enabled: false` as the default, then explicitly enable specific tools:

```
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-calendar-mcp",
  "default_config": {
    "enabled": false
  },
  "configs": {
    "search_events": {
      "enabled": true
    },
    "create_event": {
      "enabled": true
    }
  }
}
```



###

Enable all tools by default, then explicitly disable unwanted tools. Denylisting write or destructive tools is recommended when building read-only assistants, or when you want a human confirmation step before state changes:

```
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-calendar-mcp",
  "configs": {
    "delete_all_events": {
      "enabled": false
    },
    "share_calendar_publicly": {
      "enabled": false
    }
  }
}
```



###

Combine allowlisting with custom configuration for each tool:

```
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-calendar-mcp",
  "default_config": {
    "enabled": false,
    "defer_loading": true
  },
  "configs": {
    "search_events": {
      "enabled": true,
      "defer_loading": false
    },
    "list_events": {
      "enabled": true
    }
  }
}
```



In this example:

* `search_events` is enabled with `defer_loading: false`
* `list_events` is enabled with `defer_loading: true` (inherited from default\_config)
* All other tools are disabled

##

The API enforces these validation rules:

* **Server must exist**: The `mcp_server_name` in an MCPToolset must match a server defined in the `mcp_servers` array
* **Server must be used**: Every MCP server defined in `mcp_servers` must be referenced by exactly one MCPToolset
* **Unique toolset per server**: Each MCP server can only be referenced by one MCPToolset
* **Unknown tool names**: If a tool name in `configs` doesn't exist on the MCP server, a backend warning is logged but no error is returned (MCP servers may have dynamic tool availability)

##

When Claude uses MCP tools, the response includes two new content block types:

###

```
{
  "type": "mcp_tool_use",
  "id": "mcptoolu_014Q35RayjACSWkSj4X2yov1",
  "name": "echo",
  "server_name": "example-mcp",
  "input": { "param1": "value1", "param2": "value2" }
}
```



###

```
{
  "type": "mcp_tool_result",
  "tool_use_id": "mcptoolu_014Q35RayjACSWkSj4X2yov1",
  "is_error": false,
  "content": [
    {
      "type": "text",
      "text": "Hello"
    }
  ]
}
```



##

You can connect to multiple MCP servers by including multiple server definitions in `mcp_servers` and a corresponding MCPToolset for each in the `tools` array:

```
{
  "model": "claude-opus-4-8",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": "Use tools from both mcp-server-1 and mcp-server-2 to complete this task"
    }
  ],
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://mcp.example1.com/sse",
      "name": "mcp-server-1",
      "authorization_token": "TOKEN1"
    },
    {
      "type": "url",
      "url": "https://mcp.example2.com/sse",
      "name": "mcp-server-2",
      "authorization_token": "TOKEN2"
    }
  ],
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "mcp-server-1"
    },
    {
      "type": "mcp_toolset",
      "mcp_server_name": "mcp-server-2",
      "default_config": {
        "defer_loading": true
      }
    }
  ]
}
```



With many tools available, Claude selects based on tool names and descriptions. Clear, specific tool descriptions improve selection accuracy. For large tool sets (dozens of tools across several servers), consider enabling [`defer_loading`](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector#tool-configuration-options) with the [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) so only relevant tools are surfaced per query.

##

For MCP servers that require OAuth authentication, you'll need to obtain an access token. The MCP connector beta supports passing an `authorization_token` parameter in the MCP server definition.
API consumers are expected to handle the OAuth flow and obtain the access token prior to making the API call, and to refresh the token as needed.

###  Obtaining an access token for testing

The MCP inspector can guide you through the process of obtaining an access token for testing purposes.

1. Run the inspector with the following command. You need Node.js installed on your machine.

   ```
   npx @modelcontextprotocol/inspector
   ```

   
2. In the sidebar on the left, for "Transport type", select either "SSE" or "Streamable HTTP".
3. Enter the URL of the MCP server.
4. In the right area, click the "Open Auth Settings" button after "Need to configure authentication?".
5. Click "Quick OAuth Flow" and authorize on the OAuth screen.
6. Follow the steps in the "OAuth Flow Progress" section of the inspector and click "Continue" until you reach "Authentication complete".
7. Copy the `access_token` value.
8. Paste it into the `authorization_token` field in your MCP server configuration.

###

Once you've obtained an access token using either of the preceding OAuth flows, you can use it in your MCP server configuration:

```
{
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://example-server.modelcontextprotocol.io/sse",
      "name": "authenticated-server",
      "authorization_token": "YOUR_ACCESS_TOKEN_HERE"
    }
  ]
}
```



For detailed explanations of the OAuth flow, refer to the [Authorization section](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) in the MCP specification.

##

If you manage your own MCP client connection (for example, with local stdio servers, MCP prompts, or MCP resources), the SDKs provide helper functions that convert between MCP types and Claude API types. This eliminates manual conversion code when using an MCP SDK for your language (for example, the [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)) alongside the Anthropic SDK.



Use the [`mcp_servers` API parameter](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector#using-the-mcp-connector-in-the-messages-api) when you have remote servers accessible by URL and only need tool support. Use the client-side helpers when you need local servers, prompts, resources, or more control over the connection with the base SDK.

###

Install both the Anthropic SDK and the MCP SDK:

The MCP helpers are included in the `mcp` extra, which requires Python 3.10 or later:

```
pip install "anthropic[mcp]"
```



###

Import the helpers for your language:

PythonTypeScriptC#GoJavaPHPRuby



```
from anthropic.lib.tools.mcp import (
    async_mcp_tool,
    mcp_message,
    mcp_resource_to_content,
    mcp_resource_to_file,
)
```

Helper names and exact signatures follow each language's conventions; this table shows the TypeScript forms:

| Helper | Description |
| --- | --- |
| `mcpTools(tools, mcpClient)` | Converts MCP tools to Claude API tools for use with `client.beta.messages.toolRunner()` |
| `mcpMessages(messages)` | Converts MCP prompt messages to Claude API message format |
| `mcpResourceToContent(resource)` | Converts an MCP resource to a Claude API content block |
| `mcpResourceToFile(resource)` | Converts an MCP resource to a file object for upload |

###

Convert MCP tools for use with the SDK's [tool runner](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner), which handles tool execution automatically:

PythonTypeScriptC#GoJavaPHPRuby



```
from anthropic.lib.tools.mcp import async_mcp_tool
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

client = AsyncAnthropic()

async def main() -> None:
    # Connect to an MCP server
    server_params = StdioServerParameters(command="mcp-server")
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as mcp_client:
            await mcp_client.initialize()

            # List tools and convert them for the Claude API
            tools_result = await mcp_client.list_tools()
            runner = client.beta.messages.tool_runner(
                model="claude-opus-4-8",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": "What tools do you have available?"},
                ],
                tools=[async_mcp_tool(tool, mcp_client) for tool in tools_result.tools],
            )

            final_message = await runner.until_done()
            print(final_message)

asyncio.run(main())
```

###

Convert MCP prompt messages into Claude API message format:

PythonTypeScriptC#GoJavaPHPRuby



```
from anthropic.lib.tools.mcp import mcp_message

prompt = await mcp_client.get_prompt(name="my-prompt")
response = await client.beta.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[mcp_message(message) for message in prompt.messages],
)

print(response)
```

###

Convert MCP resources into content blocks to include in messages, or into file objects for upload:

PythonTypeScriptC#GoJavaPHPRuby



```
from anthropic.lib.tools.mcp import (
    mcp_resource_to_content,
    mcp_resource_to_file,
)

# As a content block in a message
resource = await mcp_client.read_resource(uri="file:///path/to/doc.txt")
response = await client.beta.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                mcp_resource_to_content(resource),
                {"type": "text", "text": "Summarize this document"},
            ],
        }
    ],
)
print(response)

# As a file upload
file_resource = await mcp_client.read_resource(
    uri="file:///path/to/data.json",
)
uploaded = await client.beta.files.upload(
    file=mcp_resource_to_file(file_resource),
)
print(uploaded.id)
```

###

The conversion functions throw `UnsupportedMCPValueError` if an MCP value isn't supported by the Claude API (in Go, the helpers return an `UnsupportedValueError`; in Java and C#, they throw `AnthropicInvalidDataException`). This can happen with unsupported content types, MIME types, or resource links (resolve resource links with your MCP client before converting).

##

You can include `mcp_servers` in [Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing) requests. MCP tool calls through the Batches API are priced the same as those in regular Messages API requests.

##

The MCP connector is not covered by ZDR arrangements. Data exchanged with MCP servers, including tool definitions and execution results, is retained according to Anthropic's standard data retention policy.

For ZDR eligibility across all features, see [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention).

##

If you're using the deprecated `mcp-client-2025-04-04` beta header, follow this guide to migrate to the new version.

###

1. **New beta header**: Change from `mcp-client-2025-04-04` to `mcp-client-2025-11-20`
2. **Tool configuration moved**: Tool configuration now lives in the `tools` array as MCPToolset objects, not in the MCP server definition
3. **More flexible configuration**: New pattern supports allowlisting, denylisting, and per-tool configuration

###

**Before (deprecated):**

```
{
  "model": "claude-opus-4-8",
  "max_tokens": 1000,
  "messages": [
    // ...
  ],
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://mcp.example.com/sse",
      "name": "example-mcp",
      "authorization_token": "YOUR_TOKEN",
      "tool_configuration": {
        "enabled": true,
        "allowed_tools": ["tool1", "tool2"]
      }
    }
  ]
}
```



**After (current):**

```
{
  "model": "claude-opus-4-8",
  "max_tokens": 1000,
  "messages": [
    // ...
  ],
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://mcp.example.com/sse",
      "name": "example-mcp",
      "authorization_token": "YOUR_TOKEN"
    }
  ],
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "example-mcp",
      "default_config": {
        "enabled": false
      },
      "configs": {
        "tool1": {
          "enabled": true
        },
        "tool2": {
          "enabled": true
        }
      }
    }
  ]
}
```



###  Common migration patterns

| Old pattern | New pattern |
| --- | --- |
| No `tool_configuration` (all tools enabled) | MCPToolset with no `default_config` or `configs` |
| `tool_configuration.enabled: false` | MCPToolset with `default_config.enabled: false` |
| `tool_configuration.allowed_tools: [...]` | MCPToolset with `default_config.enabled: false` and specific tools enabled in `configs` |

##  Deprecated version: mcp-client-2025-04-04



This version is deprecated. Migrate to `mcp-client-2025-11-20` using the preceding [migration guide](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector#migration-guide).

The previous version of the MCP connector included tool configuration directly in the MCP server definition:

```
{
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://example-server.modelcontextprotocol.io/sse",
      "name": "example-mcp",
      "authorization_token": "YOUR_TOKEN",
      "tool_configuration": {
        "enabled": true,
        "allowed_tools": ["example_tool_1", "example_tool_2"]
      }
    }
  ]
}
```



###  Deprecated field descriptions

| Property | Type | Description |
| --- | --- | --- |
| `tool_configuration` | object | **Deprecated**: Use MCPToolset in the `tools` array instead |
| `tool_configuration.enabled` | boolean | **Deprecated**: Use `default_config.enabled` in MCPToolset |
| `tool_configuration.allowed_tools` | array | **Deprecated**: Use allowlist pattern with `configs` in MCPToolset |
