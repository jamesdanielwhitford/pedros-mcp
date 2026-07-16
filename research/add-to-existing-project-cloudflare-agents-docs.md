# Add to existing project · Cloudflare Agents docs

Source: https://developers.cloudflare.com/agents/getting-started/add-to-existing-project/

---

This guide shows how to add agents to an existing Cloudflare Workers project. If you are starting fresh, refer to [Building a chat agent](https://developers.cloudflare.com/agents/examples/chat-agent/) instead.

* An existing Cloudflare Workers project with a Wrangler configuration file
* Node.js 18 or newer

For React applications, no additional packages are needed — React bindings are included.

For Hono applications:

npm  yarn  pnpm  bun

```
yarn add agents hono-agents
```

```
pnpm add agents hono-agents
```

```
bun add agents hono-agents
```

Create a new file for your agent (for example, `src/agents/counter.ts`):

```
import { Agent, callable } from "agents";

export class CounterAgent extends Agent {

initialState = { count: 0 };

this.setState({ count: this.state.count + 1 });

this.setState({ count: this.state.count - 1 });
```

```
import { Agent, callable } from "agents";

export type CounterState = {

export class CounterAgent extends Agent<Env, CounterState> {

initialState: CounterState = { count: 0 };

this.setState({ count: this.state.count + 1 });

this.setState({ count: this.state.count - 1 });
```

## 3. Update Wrangler configuration

Add the Durable Object binding and migration:

```
"name": "my-existing-project",

// Set this to today's date

"compatibility_date": "2026-07-16",

"compatibility_flags": ["nodejs_compat"],

"class_name": "CounterAgent",

"new_sqlite_classes": ["CounterAgent"],
```

```
name = "my-existing-project"

# Set this to today's date

compatibility_date = "2026-07-16"

compatibility_flags = [ "nodejs_compat" ]

[[durable_objects.bindings]]

class_name = "CounterAgent"

new_sqlite_classes = [ "CounterAgent" ]
```

**Key points:**

* `name` in bindings becomes the property on `env` (for example, `env.CounterAgent`)
* `class_name` must exactly match your exported class name
* `new_sqlite_classes` enables SQLite storage for state persistence
* `nodejs_compat` flag is required for the agents package

## 4. Configure TypeScript and Vite

If you use `@callable()` decorators (as in the example above), you need two build configurations.

**tsconfig.json** — extend `agents/tsconfig` (or set `"target": "ES2021"` manually):

```
"extends": "agents/tsconfig"
```

If you have an existing `tsconfig.json` with custom settings, you can extend and override:

```
"extends": "agents/tsconfig",

"paths": { "~/*": ["./src/*"] }
```

**vite.config.ts** — add the `agents()` plugin (handles TC39 decorator transforms for Vite 8):

```
import agents from "agents/vite";

export default defineConfig({

// ... your existing plugins
```

```
import agents from "agents/vite";

export default defineConfig({

// ... your existing plugins
```

If your project does not use Vite, the `tsconfig.json` change alone is sufficient — your bundler must support TC39 decorators (stage 3, version `2023-11`).

For more details, refer to the [TypeScript configuration](https://developers.cloudflare.com/agents/runtime/operations/configuration/#typescript-configuration) and [Vite configuration](https://developers.cloudflare.com/agents/runtime/operations/configuration/#vite-configuration) reference.

## 5. Export the Agent class

Your agent class must be exported from your main entry point. Update your `src/index.ts`:

```
// Export the agent class (required for Durable Objects)

export { CounterAgent } from "./agents/counter";

// Your existing exports...
```

```
// Export the agent class (required for Durable Objects)

export { CounterAgent } from "./agents/counter";

// Your existing exports...

} satisfies ExportedHandler<Env>;
```

Choose the approach that matches your project structure:

### Plain Workers (fetch handler)

```
import { routeAgentRequest } from "agents";

export { CounterAgent } from "./agents/counter";

async fetch(request, env, ctx) {

// Try agent routing first

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;

// Your existing routing logic

const url = new URL(request.url);

if (url.pathname === "/api/hello") {

return Response.json({ message: "Hello!" });

return new Response("Not found", { status: 404 });
```

```
import { routeAgentRequest } from "agents";

export { CounterAgent } from "./agents/counter";

async fetch(request: Request, env: Env, ctx: ExecutionContext) {

// Try agent routing first

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;

// Your existing routing logic

const url = new URL(request.url);

if (url.pathname === "/api/hello") {

return Response.json({ message: "Hello!" });

return new Response("Not found", { status: 404 });

} satisfies ExportedHandler<Env>;
```

```
import { Hono } from "hono";

import { agentsMiddleware } from "hono-agents";

export { CounterAgent } from "./agents/counter";

// Add agents middleware - handles WebSocket upgrades and agent HTTP requests

app.use("*", agentsMiddleware());

// Your existing routes continue to work

app.get("/api/hello", (c) => c.json({ message: "Hello!" }));
```

```
import { Hono } from "hono";

import { agentsMiddleware } from "hono-agents";

export { CounterAgent } from "./agents/counter";

const app = new Hono<{ Bindings: Env }>();

// Add agents middleware - handles WebSocket upgrades and agent HTTP requests

app.use("*", agentsMiddleware());

// Your existing routes continue to work

app.get("/api/hello", (c) => c.json({ message: "Hello!" }));
```

If you are serving static assets alongside agents, static assets are served first by default. Your Worker code only runs for paths that do not match a static asset:

```
import { routeAgentRequest } from "agents";

export { CounterAgent } from "./agents/counter";

async fetch(request, env, ctx) {

// Static assets are served automatically before this runs

// This only handles non-asset requests

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;

return new Response("Not found", { status: 404 });
```

```
import { routeAgentRequest } from "agents";

export { CounterAgent } from "./agents/counter";

async fetch(request: Request, env: Env, ctx: ExecutionContext) {

// Static assets are served automatically before this runs

// This only handles non-asset requests

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;

return new Response("Not found", { status: 404 });

} satisfies ExportedHandler<Env>;
```

Configure assets in the Wrangler configuration file:

## 7. Generate TypeScript types

Do not hand-write your `Env` interface. Run [`wrangler types`](https://developers.cloudflare.com/workers/wrangler/commands/general/#types) to generate a type definition file that matches your Wrangler configuration. This catches mismatches between your config and code at compile time instead of at deploy time.

Re-run `wrangler types` whenever you add or rename a binding.

This creates a type definition file with all your bindings typed, including your agent Durable Object namespaces. The `Agent` class defaults to using the generated `Env` type, so you do not need to pass it as a type parameter — `extends Agent` is sufficient unless you need to pass a second type parameter for state (for example, `Agent<Env, CounterState>`).

Refer to [Configuration](https://developers.cloudflare.com/agents/runtime/operations/configuration/#generating-types) for more details on type generation.

## 8. Connect from the frontend

```
import { useState } from "react";

import { useAgent } from "agents/react";

function CounterWidget() {

const [count, setCount] = useState(0);

onStateUpdate: (state) => setCount(state.count),

<button onClick={() => agent.stub.increment()}>+</button>

<button onClick={() => agent.stub.decrement()}>-</button>
```

```
import { useState } from "react";

import { useAgent } from "agents/react";

import type { CounterAgent, CounterState } from "./agents/counter";

function CounterWidget() {

const [count, setCount] = useState(0);

const agent = useAgent<CounterAgent, CounterState>({

onStateUpdate: (state) => setCount(state.count),

<button onClick={() => agent.stub.increment()}>+</button>

<button onClick={() => agent.stub.decrement()}>-</button>
```

Key points:

* `useAgent` connects to your agent via WebSocket
* `onStateUpdate` fires whenever the agent's state changes
* `agent.stub.methodName()` calls methods marked with `@callable()` on your agent

```
import { AgentClient } from "agents/client";

const agent = new AgentClient({

name: "user-123", // Optional: unique instance name

onStateUpdate: (state) => {

document.getElementById("count").textContent = state.count;

document.getElementById("increment").onclick = () => agent.call("increment");
```

```
import { AgentClient } from "agents/client";

const agent = new AgentClient({

name: "user-123", // Optional: unique instance name

onStateUpdate: (state) => {

document.getElementById("count").textContent = state.count;

document.getElementById("increment").onclick = () => agent.call("increment");
```

When you clicked the button:

1. **Client** called `agent.stub.increment()` over WebSocket
2. **Agent** ran `increment()`, updated state with `setState()`
3. **State** persisted to SQLite automatically
4. **Broadcast** sent to all connected clients
5. **React** updated via `onStateUpdate`

```
flowchart LR
    A["Browser<br/>(React)"] <-->|WebSocket| B["Agent<br/>(Counter)"]
    B --> C["SQLite<br/>(State)"]
```

| Concept | What it means |
| --- | --- |
| **Agent instance** | Each unique name gets its own agent. `CounterAgent:user-123` is separate from `CounterAgent:user-456` |
| **Persistent state** | State survives restarts, deploys, and hibernation. It is stored in SQLite |
| **Real-time sync** | All clients connected to the same agent receive state updates instantly |
| **Hibernation** | When no clients are connected, the agent hibernates (no cost). It wakes on the next request |

Your agent is now live on Cloudflare's global network, running close to your users.

## Common integration patterns

### Agents behind authentication

Check auth before routing to agents:

```
async fetch(request, env) {

// Check auth for agent routes

if (request.url.includes("/agents/")) {

const authResult = await checkAuth(request, env);

return new Response("Unauthorized", { status: 401 });

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;
```

```
async fetch(request: Request, env: Env) {

// Check auth for agent routes

if (request.url.includes("/agents/")) {

const authResult = await checkAuth(request, env);

return new Response("Unauthorized", { status: 401 });

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;

} satisfies ExportedHandler<Env>;
```

By default, agents are routed at `/agents/{agent-name}/{instance-name}`. You can customize this:

```
import { routeAgentRequest } from "agents";

const agentResponse = await routeAgentRequest(request, env, {

prefix: "/api/agents", // Now routes at /api/agents/{agent-name}/{instance-name}
```

```
import { routeAgentRequest } from "agents";

const agentResponse = await routeAgentRequest(request, env, {

prefix: "/api/agents", // Now routes at /api/agents/{agent-name}/{instance-name}
```

Refer to [Routing](https://developers.cloudflare.com/agents/runtime/communication/routing/) for more options including CORS, custom instance naming, and location hints.

### Accessing agents from server code

You can interact with agents directly from your Worker code:

```
import { getAgentByName } from "agents";

async fetch(request, env) {

if (request.url.endsWith("/api/increment")) {

// Get a specific agent instance

const counter = await getAgentByName(env.CounterAgent, "shared-counter");

const newCount = await counter.increment();

return Response.json({ count: newCount });
```

```
import { getAgentByName } from "agents";

async fetch(request: Request, env: Env) {

if (request.url.endsWith("/api/increment")) {

// Get a specific agent instance

const counter = await getAgentByName(env.CounterAgent, "shared-counter");

const newCount = await counter.increment();

return Response.json({ count: newCount });

} satisfies ExportedHandler<Env>;
```

Add more agents by extending the configuration:

```
export class Chat extends Agent {

// src/agents/scheduler.ts

export class Scheduler extends Agent {
```

```
export class Chat extends Agent {

// src/agents/scheduler.ts

export class Scheduler extends Agent {
```

Update the Wrangler configuration file:

```
"$schema": "./node_modules/wrangler/config-schema.json",

"class_name": "CounterAgent"

"class_name": "Scheduler"
```

```
[[durable_objects.bindings]]

class_name = "CounterAgent"

[[durable_objects.bindings]]

[[durable_objects.bindings]]

new_sqlite_classes = ["CounterAgent", "Chat", "Scheduler"]
```

Export all agents from your entry point:

```
export { CounterAgent } from "./agents/counter";

export { Chat } from "./agents/chat";

export { Scheduler } from "./agents/scheduler";
```

```
export { CounterAgent } from "./agents/counter";

export { Chat } from "./agents/chat";

export { Scheduler } from "./agents/scheduler";
```

### Agent not found, or 404 errors

1. **Check the export** - Agent class must be exported from your main entry point.
2. **Check the binding** - `class_name` in the Wrangler configuration file must exactly match the exported class name.
3. **Check the route** - Default route is `/agents/{'{agent-name}'}/{'{instance-name}'}`. Agent name in client matches the class name (case-insensitive).

### No such Durable Object class error

Add the migration to the Wrangler configuration file:

```
"$schema": "./node_modules/wrangler/config-schema.json",
```

```
new_sqlite_classes = ["YourAgentClass"]
```

### WebSocket connection fails

Ensure your routing passes the response unchanged:

```
// Correct - return the response directly

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;

// Wrong - this breaks WebSocket connections

if (agentResponse) return new Response(agentResponse.body);
```

```
// Correct - return the response directly

const agentResponse = await routeAgentRequest(request, env);

if (agentResponse) return agentResponse;

// Wrong - this breaks WebSocket connections

if (agentResponse) return new Response(agentResponse.body);
```

Check that:

1. You are calling `this.setState()`, not mutating `this.state` directly.
2. The agent class is in `new_sqlite_classes` in migrations.
3. You are connecting to the same agent instance name.
4. The `onStateUpdate` callback is wired up in your client.
5. WebSocket connection is established (check browser dev tools).

### "Method X is not callable" errors

Make sure your methods are decorated with `@callable()`:

```
import { Agent, callable } from "agents";

export class MyAgent extends Agent {
```

```
import { Agent, callable } from "agents";

export class MyAgent extends Agent {
```

### Type errors with `agent.stub`

Add the agent and state type parameters:

```
import { useAgent } from "agents/react";

// Pass the agent and state types to useAgent

onStateUpdate: (state) => setCount(state.count),

// Now agent.stub is fully typed
```

```
import { useAgent } from "agents/react";

import type { CounterAgent, CounterState } from "./server";

// Pass the agent and state types to useAgent

const agent = useAgent<CounterAgent, CounterState>({

onStateUpdate: (state) => setCount(state.count),

// Now agent.stub is fully typed
```

### `SyntaxError: Invalid or unexpected token` with `@callable()`

If your dev server fails with `SyntaxError: Invalid or unexpected token`, set `"target": "ES2021"` in your `tsconfig.json`. This ensures that Vite's esbuild transpiler downlevels TC39 decorators instead of passing them through as native syntax.

Now that you have a working agent, explore these topics:

[Client SDK](https://developers.cloudflare.com/agents/communication-channels/chat/client-sdk/)  Full useAgent and AgentClient API reference.

[Agents API](https://developers.cloudflare.com/agents/runtime/agents-api/)  Complete API reference for the Agents SDK.
