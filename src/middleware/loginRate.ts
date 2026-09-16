import { createMiddleware } from 'hono/factory'

export const loginRateLimiter = createMiddleware(async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown-ip'
  
  const { success } = await c.env.LOGIN_RATE_LIMITER.limit({ key: ip })
  
  if (!success) {
    return c.json({ error: 'TOO_MANY_REQUESTS', message: '登入嘗試次數過多，請稍後再試。' }, 429)
  }
  
  await next()
})