/**
 * 認證模組 Service 層
 * 
 * 負責登入的核心商業邏輯，包含：
 * - 查詢使用者帳號並確認啟用狀態
 * - PBKDF2 密碼驗證
 * - 計算 JWT 過期時間（UTC+8 當日午夜）
 * - 簽發包含標準 claims 的 JWT Token
 * 
 * 此層不處理 HTTP 細節，只接受純參數，回傳結果或丟出錯誤碼字串。
 */
import { sign } from 'hono/jwt'
import type { D1Database } from '@cloudflare/workers-types'
import { verifyPassword } from '../../utils/crypto'

/**
 * 處理登入的核心商業邏輯
 * @param db        - D1 資料庫實例
 * @param jwtSecret - JWT 簽章密鑰（來自環境變數）
 * @param email     - 使用者輸入的信箱
 * @param pass      - 使用者輸入的明文密碼
 * @returns 成功時回傳簽發的 JWT Token 字串
 * @throws 'AUTH_FAILED' — 帳號不存在、未啟用或密碼錯誤時丟出
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
    iss: 'portfolio-backend',  // 簽發者
    aud: 'portfolio-frontend',  // 接收者
    iat: Math.floor(Date.now() / 1000),  // 簽發時間
    nbf: Math.floor(Date.now() / 1000),  // 生效時間
    jti: crypto.randomUUID(),  // JWT ID
    exp: exp,
    id: user.id,
    email: user.email,
  };

  const token = await sign(payload, jwtSecret, 'HS256');
  return token;
}
