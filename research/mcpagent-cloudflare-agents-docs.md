# McpAgent · Cloudflare Agents docs

Source: https://developers.cloudflare.com/agents/model-context-protocol/apis/agent-api/

---

When you build MCP Servers on Cloudflare, you extend the [`McpAgent` class ↗](https://github.com/cloudflare/agents/blob/main/packages/agents/src/mcp/index.ts#L32-L620), from the Agents SDK:

```
import { McpAgent } from "agents/mcp";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMCP extends McpAgent {

server = new McpServer({ name: "Demo", version: "1.0.0" });

{ a: z.number(), b: z.number() },

content: [{ type: "text", text: String(a + b) }],
```

```
import { McpAgent } from "agents/mcp";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMCP extends McpAgent {

server = new McpServer({ name: "Demo", version: "1.0.0" });

{ a: z.number(), b: z.number() },

content: [{ type: "text", text: String(a + b) }],
```

This means that each instance of your MCP server has its own durable state, backed by a [Durable Object](https://developers.cloudflare.com/durable-objects/), with its own [SQL database](https://developers.cloudflare.com/agents/runtime/lifecycle/state/).

Your MCP server doesn't necessarily have to be an Agent. You can build MCP servers that are stateless, and just add [tools](https://developers.cloudflare.com/agents/model-context-protocol/protocol/tools/) to your MCP server using the `@modelcontextprotocol/sdk` package.

But if you want your MCP server to:

* remember previous tool calls, and responses it provided
* provide a game to the MCP client, remembering the state of the game board, previous moves, and the score
* cache the state of a previous external API call, so that subsequent tool calls can reuse it
* do anything that an Agent can do, but allow MCP clients to communicate with it

You can use the APIs below in order to do so.

| Property/Method | Description |
| --- | --- |
| `state` | Current state object (persisted) |
| `initialState` | Default state when instance starts |
| `setState(state)` | Update and persist state |
| `onStateChanged(state)` | Called when state changes |
| `sql` | Execute SQL queries on embedded database |
| `server` | The `McpServer` instance for registering tools |
| `props` | User identity and tokens from OAuth authentication |
| `elicitInput(options, context)` | Request structured input from user |
| `McpAgent.serve(path, options)` | Static method to create a Worker handler |

## Deploying with McpAgent.serve()

The `McpAgent.serve()` static method creates a Worker handler that routes requests to your MCP server:

```
import { McpAgent } from "agents/mcp";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMCP extends McpAgent {

server = new McpServer({ name: "my-server", version: "1.0.0" });

this.server.tool("square", { n: z.number() }, async ({ n }) => ({

content: [{ type: "text", text: String(n * n) }],

// Export the Worker handler

export default MyMCP.serve("/mcp");
```

```
import { McpAgent } from "agents/mcp";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMCP extends McpAgent {

server = new McpServer({ name: "my-server", version: "1.0.0" });

this.server.tool("square", { n: z.number() }, async ({ n }) => ({

content: [{ type: "text", text: String(n * n) }],

// Export the Worker handler

export default MyMCP.serve("/mcp");
```

This is the simplest way to deploy an MCP server — about 15 lines of code. The `serve()` method handles Streamable HTTP transport automatically.

### With OAuth authentication

When using the [OAuth Provider Library ↗](https://github.com/cloudflare/workers-oauth-provider), pass your MCP server to `apiHandlers`:

```
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";

export default new OAuthProvider({

apiHandlers: { "/mcp": MyMCP.serve("/mcp") },

authorizeEndpoint: "/authorize",

clientRegistrationEndpoint: "/register",

defaultHandler: AuthHandler,
```

```
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";

export default new OAuthProvider({

apiHandlers: { "/mcp": MyMCP.serve("/mcp") },

authorizeEndpoint: "/authorize",

clientRegistrationEndpoint: "/register",

defaultHandler: AuthHandler,
```

For GDPR and data residency compliance, specify a jurisdiction to ensure your MCP server instances run in specific regions:

```
// EU jurisdiction for GDPR compliance

export default MyMCP.serve("/mcp", { jurisdiction: "eu" });
```

```
// EU jurisdiction for GDPR compliance

export default MyMCP.serve("/mcp", { jurisdiction: "eu" });
```

With OAuth:

```
export default new OAuthProvider({

"/mcp": MyMCP.serve("/mcp", { jurisdiction: "eu" }),

// ... other OAuth config
```

```
export default new OAuthProvider({

"/mcp": MyMCP.serve("/mcp", { jurisdiction: "eu" }),

// ... other OAuth config
```

When you specify `jurisdiction: "eu"`:

* All MCP session data stays within the EU
* User data processed by your tools remains in the EU
* State stored in the Durable Object stays in the EU

Available jurisdictions include `"eu"` (European Union) and `"fedramp"` (FedRAMP compliant locations). Refer to [Durable Objects data location](https://developers.cloudflare.com/durable-objects/reference/data-location/) for more options.

`McpAgent` instances automatically support [WebSockets Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/#durable-objects-hibernation-websocket-api), allowing stateful MCP servers to sleep during inactive periods while preserving their state. This means your agents only consume compute resources when actively processing requests, optimizing costs while maintaining the full context and conversation history.

Hibernation is enabled by default and requires no additional configuration.

`McpAgent`'s Streamable HTTP transport survives the roughly 5-minute Cloudflare edge idle-stream watchdog so in-flight tool calls are not lost on a flaky connection:

* **GET (standalone listen stream)** — when an `EventStore` is configured, idle drops are recovered by clients reconnecting with a `Last-Event-ID` header (no keepalive needed). Without an `EventStore`, a comment-frame keepalive (`: keepalive`, every 25 seconds) keeps long-lived listeners alive.
* **POST (tool response stream)** — always keepalive, so in-flight tool calls survive the idle watchdog. POST streams can additionally be resumed via `Last-Event-ID` when an `EventStore` is configured; a reconnecting client replays any events it missed up to and including the final response. Each POST stream's events are cleared when its close frame is written.

`DurableObjectEventStore` is exported from `agents/mcp` for stateful `WorkerTransport` callers that embed the transport inside an Agent or Durable Object:

```
import { DurableObjectEventStore } from "agents/mcp";

const eventStore = new DurableObjectEventStore(this.ctx.storage);
```

```
import { DurableObjectEventStore } from "agents/mcp";

const eventStore = new DurableObjectEventStore(this.ctx.storage);
```

Refer to [MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/protocol/transport/) for transport configuration.

## Authentication and authorization

The McpAgent class provides seamless integration with the [OAuth Provider Library ↗](https://github.com/cloudflare/workers-oauth-provider) for [authentication and authorization](https://developers.cloudflare.com/agents/model-context-protocol/protocol/authorization/).

When a user authenticates to your MCP server, their identity information and tokens are made available through the `props` parameter, allowing you to:

* access user-specific data
* check user permissions before performing operations
* customize responses based on user attributes
* use authentication tokens to make requests to external services on behalf of the user

## State synchronization APIs

The `McpAgent` class provides full access to the [Agent state APIs](https://developers.cloudflare.com/agents/runtime/lifecycle/state/):

State resets after the session ends

Currently, each client session is backed by an instance of the `McpAgent` class. This is handled automatically for you, as shown in the [getting started guide](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/). This means that when the same client reconnects, they will start a new session, and the state will be reset.

For example, the following code implements an MCP server that remembers a counter value, and updates the counter when the `add` tool is called:

```
import { McpAgent } from "agents/mcp";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMCP extends McpAgent {

this.server.resource(`counter`, `mcp://resource/counter`, (uri) => {

contents: [{ uri: uri.href, text: String(this.state.counter) }],

"Add to the counter, stored in the MCP",

this.setState({ ...this.state, counter: this.state.counter + a });

text: String(`Added ${a}, total is now ${this.state.counter}`),

console.log({ stateUpdate: state });
```

```
import { McpAgent } from "agents/mcp";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type State = { counter: number };

export class MyMCP extends McpAgent<Env, State, {}> {

this.server.resource(`counter`, `mcp://resource/counter`, (uri) => {

contents: [{ uri: uri.href, text: String(this.state.counter) }],

"Add to the counter, stored in the MCP",

this.setState({ ...this.state, counter: this.state.counter + a });

text: String(`Added ${a}, total is now ${this.state.counter}`),

onStateChanged(state: State) {

console.log({ stateUpdate: state });
```

[MCP elicitation ↗](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation) lets a server request user input while handling another request, such as a tool call. The current stable MCP specification defines two modes:

* **Form mode** collects structured, non-sensitive data through the client.
* **URL mode** sends the user to an out-of-band interaction, such as third-party authorization or payment.

The client must advertise support for a mode before the server sends it.

Call `this.server.server.elicitInput()` in a tool handler. Pass `extra.requestId` as `relatedRequestId` so the response returns on the stream for the originating tool call:

```
const result = await this.server.server.elicitInput(

message: "By how much do you want to increase the counter?",

{ relatedRequestId: extra.requestId },

if (result.action !== "accept" || !result.content) {

return { content: [{ type: "text", text: "Counter unchanged." }] };

const amount = Number(result.content.amount);
```

```
const result = await this.server.server.elicitInput(

message: "By how much do you want to increase the counter?",

{ relatedRequestId: extra.requestId },

if (result.action !== "accept" || !result.content) {

return { content: [{ type: "text", text: "Counter unchanged." }] };

const amount = Number(result.content.amount);
```

For backwards compatibility, form requests may omit `mode: "form"`. The schema supports flat objects with primitive fields. Do not use form mode to request passwords, API keys, access tokens, payment credentials, or other secrets.

Use URL mode for interactions that must happen outside the MCP client. The request includes a message, the URL, and a unique `elicitationId`:

```
const elicitationId = crypto.randomUUID();

const result = await this.server.server.elicitInput(

message: "Connect your account to continue.",

url: `https://example.com/connect?elicitationId=${elicitationId}`,

{ relatedRequestId: extra.requestId },

if (result.action !== "accept") {

return { content: [{ type: "text", text: "Connection cancelled." }] };

text: "Connection page opened. Complete it in your browser.",
```

```
const elicitationId = crypto.randomUUID();

const result = await this.server.server.elicitInput(

message: "Connect your account to continue.",

url: `https://example.com/connect?elicitationId=${elicitationId}`,

{ relatedRequestId: extra.requestId },

if (result.action !== "accept") {

return { content: [{ type: "text", text: "Connection cancelled." }] };

text: "Connection page opened. Complete it in your browser.",
```

For URL mode, `accept` means the user consented to open the URL. It does not mean the external interaction finished. The server may later send `notifications/elicitation/complete` with the same `elicitationId`.

Do not put secrets, personal information, or a pre-authenticated protected-resource URL in `url`. Production servers should use HTTPS. Bind each request to the authenticated user, and verify that the same user completes the external flow.

Both modes return one of three actions:

| Action | Meaning |
| --- | --- |
| `accept` | The user submitted the form or consented to open the URL. |
| `decline` | The user explicitly rejected the request. |
| `cancel` | The user dismissed the request without making an explicit choice. |

Accepted form responses include `content` that matches `requestedSchema`. URL responses omit `content`. Decline and cancel responses typically omit it.

```
// For form mode, validate and process result.content.

return { content: [{ type: "text", text: "Request declined." }] };

return { content: [{ type: "text", text: "Request dismissed." }] };
```

```
// For form mode, validate and process result.content.

return { content: [{ type: "text", text: "Request declined." }] };

return { content: [{ type: "text", text: "Request dismissed." }] };
```

For more human-in-the-loop patterns, refer to [Human-in-the-loop patterns](https://developers.cloudflare.com/agents/concepts/agentic-patterns/human-in-the-loop/).

[MCP Tools](https://developers.cloudflare.com/agents/model-context-protocol/protocol/tools/)  Design and add tools to your MCP server.
