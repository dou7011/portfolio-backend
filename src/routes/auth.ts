import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import * as bcrypt from 'bcryptjs'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

// 建立一個獨立的 Hono 實例
const auth = new Hono<{ Bindings: Bindings }>()

// 初始化管理員帳號
auth.post('/setup', async (c) => {
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
})

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

    const secret = 'my-super-secret-key-for-portfolio'; 
    const token = await sign(payload, secret);

    return c.json({ success: true, message: '登入成功', token });

  } catch (error: any) {
    // 🌟 如果後端真的出錯，至少要回傳 500，前端才不會無限卡死
    return c.json({ success: false, message: '後端發生未知錯誤', error: error.message }, 500);
  }
});

export default auth