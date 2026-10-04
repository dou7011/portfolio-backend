import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import type { AppEnv } from '../types'
import { fail } from '../utils/response'

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const csrfGuard = async (c: Context<AppEnv>, next: Next) => {
  const CSRF_EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/logout'])
  if (!unsafeMethods.has(c.req.method) || CSRF_EXEMPT_PATHS.has(c.req.path))
  {
    await next()
    return
  }

  const csrfCookie = getCookie(c, 'portfolio_csrf')
  const csrfHeader = c.req.header('X-CSRF-Token')

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return fail(c, 403, 'CSRF_FAILED', 'CSRF 驗證失敗')
  }

  await next()
}