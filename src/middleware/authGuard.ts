import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { D1Database } from '@cloudflare/workers-types'

export const authGuard = async (c: Context, next: Next) => {
  // 1. 取得 Header 中的 Authorization
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: '未提供授權 Token 或格式錯誤' }, 401)
  }

  // 取出 Bearer 後面的 Token 字串
  const token = authHeader.split(' ')[1]

  try {
    // 2. 驗證 Token 是否是由我們的 JWT_SECRET 簽發的，且是否過期
    // 如果過期或被竄改，這裡會直接報錯跳到 catch
    const decodedPayload = await verify(token, c.env.JWT_SECRET as string, 'HS256')
    const userId = decodedPayload.id as number

    // 3. 【核心防護】即時打資料庫，確保權限是最新的
    const db = c.env.DB as D1Database
    const user = await db.prepare(
      `SELECT role, is_active FROM users WHERE id = ?`
    ).bind(userId).first<{ role: string, is_active: number }>()

    if (!user) {
      return c.json({ success: false, message: '找不到該帳號' }, 401)
    }

    if (user.is_active === 0) {
      return c.json({ success: false, message: '帳號已被停用，強制登出' }, 403)
    }

    if (user.role !== 'ADMIN') {
      return c.json({ success: false, message: '權限不足，必須為管理員' }, 403)
    }

    // 4. 驗證全數通過，放行到下一個 API 動作
    await next()

  } catch (error: any) {
    return c.json({ success: false, message: 'Token 無效或已過期，請重新登入' }, 401)
  }
}