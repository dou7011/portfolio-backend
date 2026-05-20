import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import * as bcrypt from 'bcryptjs'
import type { D1Database } from '@cloudflare/workers-types'
import { verify } from 'hono/jwt'
import { authGuard } from '../middleware/authGuard'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

// 建立一個獨立的 Hono 實例
const auth = new Hono<{ Bindings: Bindings }>()

// 註冊管理員帳號
/*auth.post('/setup', async (c) => {
  const body = await c.req.json()
  const { email, password } = body

  if (!email || !password) {
    return c.json({ success: false, message: '請提供信箱與密碼!' }, 400)
  }

  const salt = bcrypt.genSaltSync(10)
  const hashedPassword = bcrypt.hashSync(password, salt)

  try {
    await c.env.DB.prepare(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'ADMIN')`
    ).bind(email, hashedPassword).run()

    return c.json({ success: true, message: '管理員帳號建立成功!' })
  } catch (error: any) {
    return c.json({ success: false, message: '帳號建立失敗!' }, 500)
  }
})*/

// 管理員登入
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, message: '請提供信箱與密碼' }, 400);
  }

  try {
    // 去資料庫找這個 email
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).all();

    if (results.length === 0) {
      return c.json({ success: false, message: '帳號或密碼錯誤' }, 401);
    }

    const user = results[0];

    // 使用 bcrypt 比對密碼
    const isValid = bcrypt.compareSync(password, user.password_hash as string);

    if (!isValid) {
      return c.json({ success: false, message: '帳號或密碼錯誤' }, 401);
    }

    // 簽發 JWT Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    };

    const token = await sign(payload, c.env.JWT_SECRET, 'HS256');

    return c.json({ success: true, message: '登入成功', token });

  } catch (error: any) {
    // 🌟 如果後端真的出錯，至少要回傳 500，前端才不會無限卡死
    return c.json({ success: false, message: '後端發生未知錯誤', error: error.message }, 500);
  }
});

// 🌟 即時權限驗證 API (讓前端守衛每次切換頁面時校驗)
auth.get('/me', authGuard, async (c) => {
  // 1. 從 Headers 拿到 Authorization 標頭
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: '未提供憑證，拒絕存取' }, 401);
  }

  // 2. 切出 Token 本體 (拔掉 "Bearer " 字樣)
  const token = authHeader.split(' ')[1];

  try {
    // 3. 解碼並驗證 Token 是否合法、是否過期
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');

    // 4. 🌟 實作「權限要是最新」
    // 雖然 Token 裡面有寫 role，但為了防止帳號中途被停權或改權限，
    // 我們直接拿 Token 裡的 id 去 D1 資料庫撈最新狀態！
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, role, is_active FROM users WHERE id = ?'
    ).bind(payload.id).all();

    if (results.length === 0 || results[0].is_active !== 1) {
      return c.json({ success: false, message: '帳號不存在或已被停權' }, 401);
    }

    const currentUser = results[0];

    // 5. 驗證通過，把最新的使用者資料與成功狀態回傳給前端守衛
    return c.json({
      success: true,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role
      }
    });

  } catch (error) {
    // 如果 Token 過期、被篡改、解碼失敗，一律丟出 401 讓前端踢人
    return c.json({ success: false, message: '憑證無效或已過期' }, 401);
  }
});

export default auth