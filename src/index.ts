/**
 * Welcome to Cloudflare Workers with Hono! This is your first Hono worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 * Learn more about Hono at https://hono.dev/

 */

import { Hono } from 'hono'

type Bindings = {
  // Add your bindings here, e.g.:
  // DB: D1Database
  // MY_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// Basic Hello World route
app.get('/', (c) => {
  return c.text('Hello World!')
})

// JSON response example
app.get('/json', (c) => {
  return c.json({ message: 'Hello World from Hono!' })
})

// Route with parameters
app.get('/hello/:name', (c) => {
  const name = c.req.param('name')
  return c.text(`Hello ${name}!`)

})

export default app
