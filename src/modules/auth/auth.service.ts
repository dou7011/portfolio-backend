// Auth 服務，封裝登入流程的商業邏輯與 JWT 簽發。
import { sign } from 'hono/jwt'
import type { D1Database } from '@cloudflare/workers-types'
import { verifyPassword } from '../../utils/crypto'

// 設定鎖定規則 (可以寫在環境變數或 config 裡)
const MAX_FAILED_ATTEMPTS = 5;        // 允許連續錯誤 5 次
const LOCKOUT_DURATION_SECONDS = 900; // 鎖定 15 分鐘 (900秒)

/**
 * 認證模組 Service 層。
 *
 * 負責登入流程的核心邏輯：查詢帳號、驗證密碼、建立 JWT，並處理帳號鎖定防護。
 */
export const loginUserService = async (
  db: D1Database,
  jwtSecret: string,
  jwtIssuer: string,
  jwtAudience: string,
  email: string,
  pass: string
): Promise<string> => {
  // 1. 查詢帳號
  const { results } = await db.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).all()

  if (results.length === 0) {
    throw new Error('AUTH_FAILED')
  }

  const user = results[0] as any
  const nowTimestamp = Math.floor(Date.now() / 1000)

  // 2. 檢查帳號是否處於鎖定狀態
  if (user.locked_until && user.locked_until > nowTimestamp) {
    const remainSeconds = user.locked_until - nowTimestamp
    const remainMinutes = Math.ceil(remainSeconds / 60)
    // 拋出帶有剩餘時間的錯誤
    throw new Error(`ACCOUNT_LOCKED:${remainMinutes}`) 
  }

  // 3. 驗證密碼
  const isValid = await verifyPassword(pass, user.password_hash as string)
  
  if (!isValid) {
    // 密碼錯誤：處理失敗計數與鎖定
    const currentFails = user.failed_login_attempts || 0
    const newFails = currentFails + 1
    
    let newLockedUntil = null
    
    // 若達到最大失敗次數，設定鎖定時間
    if (newFails >= MAX_FAILED_ATTEMPTS) {
      newLockedUntil = nowTimestamp + LOCKOUT_DURATION_SECONDS
    }

    // 將失敗次數與鎖定時間寫回 D1 資料庫
    await db.prepare(
      'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?'
    ).bind(newFails, newLockedUntil, user.id).run()

    // 若剛好觸發鎖定，回傳鎖定錯誤；否則回傳一般驗證失敗
    if (newLockedUntil) {
      throw new Error(`ACCOUNT_LOCKED:${Math.ceil(LOCKOUT_DURATION_SECONDS / 60)}`)
    } else {
      throw new Error('AUTH_FAILED')
    }
  }

  // 4. 密碼正確：登入成功，重置失敗次數與鎖定狀態
  if (user.failed_login_attempts > 0 || user.locked_until) {
    await db.prepare(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?'
    ).bind(user.id).run()
  }

  // 5. 簽發 JWT
  const nowMs = Date.now()
  const twTimeMs = nowMs + (8 * 60 * 60 * 1000)
  const twDate = new Date(twTimeMs)
  twDate.setUTCHours(24, 0, 0, 0)
  const exp = Math.floor((twDate.getTime() - (8 * 60 * 60 * 1000)) / 1000)

  const payload = {
    iss: jwtIssuer,
    aud: jwtAudience,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
    exp,
    id: Number(user.id),
    email: user.email,
  }

  return sign(payload, jwtSecret, 'HS256')
}