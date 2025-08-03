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
  DB: D1Database
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

// Logs endpoints
app.get('/logs', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM Logs ORDER BY created DESC').all()
    return c.json({ logs: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch logs' }, 500)
  }
})

app.get('/logs/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare('SELECT * FROM Logs WHERE id = ?').bind(id).first()
    
    if (!result) {
      return c.json({ error: 'Log not found' }, 404)
    }
    
    return c.json({ log: result })
  } catch (error) {
    return c.json({ error: 'Failed to fetch log' }, 500)
  }
})

app.put('/logs/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    
    // Validate input
    if (!body.command && !body.message) {
      return c.json({ error: 'At least command or message is required' }, 400)
    }
    
    // Check if log exists
    const existingLog = await c.env.DB.prepare('SELECT id FROM Logs WHERE id = ?').bind(id).first()
    if (!existingLog) {
      return c.json({ error: 'Log not found' }, 404)
    }
    
    // Build update query dynamically
    const updates = []
    const values = []
    
    if (body.command !== undefined) {
      updates.push('command = ?')
      values.push(body.command)
    }
    
    if (body.message !== undefined) {
      updates.push('message = ?')
      values.push(body.message)
    }
    
    values.push(id)
    
    const query = `UPDATE Logs SET ${updates.join(', ')} WHERE id = ?`
    await c.env.DB.prepare(query).bind(...values).run()
    
    // Return updated log
    const updatedLog = await c.env.DB.prepare('SELECT * FROM Logs WHERE id = ?').bind(id).first()
    return c.json({ log: updatedLog })
    
  } catch (error) {
    return c.json({ error: 'Failed to update log' }, 500)
  }
})

app.post('/logs', async (c) => {
  try {
    const body = await c.req.json()
    
    if (!body.command || !body.message) {
      return c.json({ error: 'command and message are required' }, 400)
    }
    
    const result = await c.env.DB.prepare(
      'INSERT INTO Logs (command, message) VALUES (?, ?) RETURNING *'
    ).bind(body.command, body.message).first()
    
    return c.json({ log: result }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create log' }, 500)
  }
})

export default app
