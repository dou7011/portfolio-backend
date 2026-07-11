// Auth 服務，封裝登入流程的商業邏輯與 JWT 簽發。
import { sign } from 'hono/jwt'
import type { D1Database } from '@cloudflare/workers-types'
import { verifyPassword } from '../../utils/crypto'

/**
 * 認證模組 Service 層。
 *
 * 負責登入流程的核心邏輯：查詢帳號、驗證密碼、建立 JWT。
 */
export const loginUserService = async (db: D1Database, jwtSecret: string, email: string, pass: string): Promise<string> => {
  const { results } = await db.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).all()

  if (results.length === 0) {
    throw new Error('AUTH_FAILED')
  }

  const user = results[0] as any

  const isValid = await verifyPassword(pass, user.password_hash as string)
  if (!isValid) {
    throw new Error('AUTH_FAILED')
  }

  const nowMs = Date.now()
  const twTimeMs = nowMs + (8 * 60 * 60 * 1000)
  const twDate = new Date(twTimeMs)
  twDate.setUTCHours(24, 0, 0, 0)
  const exp = Math.floor((twDate.getTime() - (8 * 60 * 60 * 1000)) / 1000)

  const payload = {
    iss: 'portfolio-backend',
    aud: 'portfolio-frontend',
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
    exp,
    id: user.id,
    email: user.email,
  }

  return sign(payload, jwtSecret, 'HS256')
}
