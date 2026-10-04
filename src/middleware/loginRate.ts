import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'
import { fail } from '../utils/response'

export const loginRateLimiter = createMiddleware<AppEnv>(async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown-ip'
  
  const { success } = await c.env.LOGIN_RATE_LIMITER.limit({ key: ip })
  
  if (!success) {
    // 👇 使用統一的 fail() 封裝回傳 429
    return fail(c, 429, 'TOO_MANY_REQUESTS', '登入嘗試次數過多，請稍後再試。')
  }
  
  await next()
})