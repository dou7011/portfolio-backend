import type { Context } from 'hono'

export const parseJsonBody = async <T>(c: Context): Promise<T | null> => {
  const contentType = c.req.header('Content-Type')
  if (!contentType?.toLowerCase().startsWith('application/json')) {
    return null
  }

  try {
    const body = await c.req.json<T>()
    if (body === null || Array.isArray(body) || typeof body !== 'object') {
      return null
    }
    return body
  } catch {
    return null
  }
}