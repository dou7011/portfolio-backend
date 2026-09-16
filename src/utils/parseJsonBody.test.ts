import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseJsonBody } from './parseJsonBody'

const app = new Hono()

app.post('/', async (c) => {
  const body = await parseJsonBody<{ name: string }>(c)
  return c.json({ valid: body !== null, body }, body ? 200 : 400)
})

describe('parseJsonBody', () => {
  it('accepts a JSON object with a JSON content type', async () => {
    const response = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ name: 'portfolio' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ valid: true, body: { name: 'portfolio' } })
  })

  it('rejects malformed JSON, non-JSON content types, and non-object bodies', async () => {
    const malformedJson = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    const wrongContentType = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{"name":"portfolio"}',
    })
    const arrayBody = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
    })

    expect(malformedJson.status).toBe(400)
    expect(wrongContentType.status).toBe(400)
    expect(arrayBody.status).toBe(400)
  })
})