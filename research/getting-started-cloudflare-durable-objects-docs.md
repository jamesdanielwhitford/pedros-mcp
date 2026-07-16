# Getting started · Cloudflare Durable Objects docs

Source: https://developers.cloudflare.com/durable-objects/get-started/

---

This guide will instruct you through:

* Writing a JavaScript class that defines a Durable Object.
* Using Durable Objects SQL API to query a Durable Object's private, embedded SQLite database.
* Instantiating and communicating with a Durable Object from another Worker.
* Deploying a Durable Object and a Worker that communicates with a Durable Object.

If you wish to learn more about Durable Objects, refer to [What are Durable Objects?](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/).

If you want to skip the steps and get started quickly, click on the button below.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/hello-world-do-template)

This creates a repository in your GitHub account and deploys the application to Cloudflare Workers. Use this option if you are familiar with Cloudflare Workers, and wish to skip the step-by-step guidance.

You may wish to manually follow the steps if you are new to Cloudflare Workers.

1. Sign up for a [Cloudflare account ↗](https://dash.cloudflare.com/sign-up/workers-and-pages).
2. Install [`Node.js` ↗](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

Node.js version manager

Use a Node version manager like [Volta ↗](https://volta.sh/) or [nvm ↗](https://github.com/nvm-sh/nvm) to avoid permission issues and change Node.js versions. [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/), discussed later in this guide, requires a Node version of `16.17.0` or later.

## 1. Create a Worker project

You will access your Durable Object from a [Worker](https://developers.cloudflare.com/workers/). Your Worker application is an interface to interact with your Durable Object.

To create a Worker project, run:

npm  yarn  pnpm

```
npm create cloudflare@latest -- durable-object-starter
```

```
yarn create cloudflare durable-object-starter
```

```
pnpm create cloudflare@latest durable-object-starter
```

Running `create cloudflare@latest` will install [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/), the Workers CLI. You will use Wrangler to test and deploy your project.

For setup, select the following options:

* For *What would you like to start with?*, choose `Hello World example`.
* For *Which template would you like to use?*, choose `Worker + Durable Objects`.
* For *Which language do you want to use?*, choose `TypeScript`.
* For *Do you want to use git for version control?*, choose `Yes`.
* For *Do you want to deploy your application?*, choose `No` (we will be making some changes before deploying).

This will create a new directory, which will include either a `src/index.js` or `src/index.ts` file to write your code and a [`wrangler.jsonc`](https://developers.cloudflare.com/workers/wrangler/configuration/) configuration file.

Move into your new directory:

```
cd durable-object-starter
```

Adding a Durable Object to an existing Worker

To add a Durable Object to an existing Worker, you need to:

## 2. Write a Durable Object class using SQL API

Before you create and access a Durable Object, its behavior must be defined by an ordinary exported JavaScript class.

Your `MyDurableObject` class will have a constructor with two parameters. The first parameter, `ctx`, passed to the class constructor contains state specific to the Durable Object, including methods for accessing storage. The second parameter, `env`, contains any bindings you have associated with the Worker when you uploaded it.

```
export class MyDurableObject extends DurableObject {

// Required, as we're extending the base class.
```

```
export class MyDurableObject extends DurableObject<Env> {

constructor(ctx: DurableObjectState, env: Env) {

// Required, as we're extending the base class.
```

```
from workers import DurableObject

class MyDurableObject(DurableObject):

def __init__(self, ctx, env):

super().__init__(ctx, env)
```

Workers communicate with a Durable Object using [remote-procedure call](https://developers.cloudflare.com/workers/runtime-apis/rpc/#_top). Public methods on a Durable Object class are exposed as [RPC methods](https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/) to be called by another Worker.

Your file should now look like:

```
export class MyDurableObject extends DurableObject {

// Required, as we're extending the base class.

let result = this.ctx.storage.sql

.exec("SELECT 'Hello, World!' as greeting")
```

```
export class MyDurableObject extends DurableObject<Env> {

constructor(ctx: DurableObjectState, env: Env) {

// Required, as we're extending the base class.

async sayHello(): Promise<string> {

let result = this.ctx.storage.sql

.exec("SELECT 'Hello, World!' as greeting")
```

```
from workers import DurableObject

class MyDurableObject(DurableObject):

async def say_hello(self):

result = self.ctx.storage.sql.exec(

"SELECT 'Hello, World!' as greeting"
```

In the code above, you have:

1. Defined a RPC method, `sayHello()`, that can be called by a Worker to communicate with a Durable Object.
2. Accessed a Durable Object's attached storage, which is a private SQLite database only accessible to the object, using [SQL API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#exec) methods (`sql.exec()`) available on `ctx.storage` .
3. Returned an object representing the single row query result using `one()`, which checks that the query result has exactly one row.
4. Return the `greeting` column from the row object result.

## 3. Instantiate and communicate with a Durable Object

A Worker is used to [access Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/).

To communicate with a Durable Object, the Worker's fetch handler should look like the following:

```
async fetch(request, env, ctx) {

const stub = env.MY_DURABLE_OBJECT.getByName(new URL(request.url).pathname);

const greeting = await stub.sayHello();

return new Response(greeting);
```

```
async fetch(request, env, ctx): Promise<Response> {

const stub = env.MY_DURABLE_OBJECT.getByName(new URL(request.url).pathname);

const greeting = await stub.sayHello();

return new Response(greeting);

} satisfies ExportedHandler<Env>;
```

```
from workers import handler, Response, WorkerEntrypoint

from urllib.parse import urlparse

class Default(WorkerEntrypoint):

async def fetch(request):

url = urlparse(request.url)

stub = self.env.MY_DURABLE_OBJECT.getByName(url.path)

greeting = await stub.say_hello()

return Response(greeting)
```

In the code above, you have:

1. Exported your Worker's main event handlers, such as the `fetch()` handler for receiving HTTP requests.
2. Passed `env` into the `fetch()` handler. Bindings are delivered as a property of the environment object passed as the second parameter when an event handler or class constructor is invoked.
3. Constructed a stub for a Durable Object instance based on the provided name. A stub is a client object used to send messages to the Durable Object.
4. Called a Durable Object by invoking a RPC method, `sayHello()`, on the Durable Object, which returns a `Hello, World!` string greeting.
5. Received an HTTP response back to the client by constructing a HTTP Response with `return new Response()`.

Refer to [Access a Durable Object from a Worker](https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/) to learn more about communicating with a Durable Object.

## 4. Configure Durable Object bindings

[Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/) allow your Workers to interact with resources on the Cloudflare developer platform. The Durable Object bindings in your Worker project's [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/) will include a binding name (for this guide, use `MY_DURABLE_OBJECT`) and the class name (`MyDurableObject`).

```
"name": "MY_DURABLE_OBJECT",

"class_name": "MyDurableObject"
```

```
[[durable_objects.bindings]]

name = "MY_DURABLE_OBJECT"

class_name = "MyDurableObject"
```

The `bindings` section contains the following fields:

* `name` - Required. The binding name to use within your Worker.
* `class_name` - Required. The class name you wish to bind to.
* `script_name` - Optional. Defaults to the current [environment's](https://developers.cloudflare.com/durable-objects/reference/environments/) Worker code.

## 5. Configure Durable Object class with SQLite storage backend

You declare each Durable Object class your Worker exports in the `exports` field of your Wrangler configuration file. Cloudflare uses this declaration to provision a namespace for the class the first time you deploy, and to manage its lifecycle on later deploys (rename, delete, transfer).

The minimal `exports` block to register a new Durable Object class with SQLite storage looks like:

```
"type": "durable-object",
```

```
[exports.MyDurableObject]
```

Refer to [Durable Object class exports](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/) to learn more about declaring and managing Durable Object classes. If you have an existing Worker on the legacy `migrations` array, refer to [Durable Object class migrations (legacy)](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/).

## 6. Develop a Durable Object Worker locally

To test your Durable Object locally, run [`wrangler dev`](https://developers.cloudflare.com/workers/wrangler/commands/general/#dev):

In your console, you should see a`Hello world` string returned by the Durable Object.

## 7. Deploy your Durable Object Worker

To deploy your Durable Object Worker:

Once deployed, you should be able to see your newly created Durable Object Worker on the Cloudflare dashboard.

 [Go to **Workers & Pages**](https://dash.cloudflare.com/?to=/:account/workers-and-pages)

Preview your Durable Object Worker at `<YOUR_WORKER>.<YOUR_SUBDOMAIN>.workers.dev`.

Your final code should look like this:

```
import { DurableObject } from "cloudflare:workers";

export class MyDurableObject extends DurableObject {

// Required, as we are extending the base class.

let result = this.ctx.storage.sql

.exec("SELECT 'Hello, World!' as greeting")

async fetch(request, env, ctx) {

const stub = env.MY_DURABLE_OBJECT.getByName(new URL(request.url).pathname);

const greeting = await stub.sayHello();

return new Response(greeting);
```

```
import { DurableObject } from "cloudflare:workers";

export class MyDurableObject extends DurableObject<Env> {

constructor(ctx: DurableObjectState, env: Env) {

// Required, as we are extending the base class.

async sayHello():Promise<string> {

let result = this.ctx.storage.sql

.exec("SELECT 'Hello, World!' as greeting")

async fetch(request, env, ctx): Promise<Response> {

const stub = env.MY_DURABLE_OBJECT.getByName(new URL(request.url).pathname);

const greeting = await stub.sayHello();

return new Response(greeting);

} satisfies ExportedHandler<Env>;
```

```
from workers import DurableObject, handler, Response

from urllib.parse import urlparse

class MyDurableObject(DurableObject):

async def say_hello(self):

result = self.ctx.storage.sql.exec(

"SELECT 'Hello, World!' as greeting"

class Default(WorkerEntrypoint):

async def fetch(self, request):

url = urlparse(request.url)

stub = self.env.MY_DURABLE_OBJECT.getByName(url.path)

greeting = await stub.say_hello()

return Response(greeting)
```

By finishing this tutorial, you have:

* Successfully created a Durable Object
* Called the Durable Object by invoking a [RPC method](https://developers.cloudflare.com/workers/runtime-apis/rpc/)
* Deployed the Durable Object globally
