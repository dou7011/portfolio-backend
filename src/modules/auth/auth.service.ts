import { sign } from 'hono/jwt'
import type { D1Database } from '@cloudflare/workers-types'
import { verifyPassword } from '../../utils/crypto'

/**
 * 處理登入的核心商業邏輯
 * @returns 成功時回傳簽發的 JWT Token 字串
 * @throws 失敗時丟出對應的錯誤訊息字串
 */
export const loginUserService = async (db: D1Database, jwtSecret: string, email: string, pass: string): Promise<string> => {
  // 資料庫找這個 email
  const { results } = await db.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).all();

  if (results.length === 0) {
    throw new Error('AUTH_FAILED'); // 帳號不存在或未啟用
  }

  const user = results[0];

  // 使用密碼工具驗證密碼
  const isValid = await verifyPassword(pass, user.password_hash as string);
  if (!isValid) {
    throw new Error('AUTH_FAILED'); // 密碼錯誤
  }

  // 計算當天晚上 12 點過期的時間 (UTC+8)
  const nowMs = Date.now();
  const twTimeMs = nowMs + (8 * 60 * 60 * 1000);
  const twDate = new Date(twTimeMs);
  twDate.setUTCHours(24, 0, 0, 0);
  const exp = Math.floor((twDate.getTime() - (8 * 60 * 60 * 1000)) / 1000);

  // 建立負載並簽發 JWT Token
  const payload = {
    id: user.id,
    email: user.email,
    exp: exp,
  };

  const token = await sign(payload, jwtSecret, 'HS256');
  return token;
}
