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
    return c.json({ success: false, message: '請提供信箱與密碼' }, 400)
  }

  const salt = bcrypt.genSaltSync(10)
  const hashedPassword = bcrypt.hashSync(password, salt)

  try {
    await c.env.DB.prepare(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'ADMIN')`
    ).bind(email, hashedPassword).run()

    return c.json({ success: true, message: '管理員帳號建立成功！' })
  } catch (error: any) {
    return c.json({ success: false, message: '帳號建立失敗，Email 可能已存在', error: error.message }, 500)
  }
})

// 管理員登入
auth.post('/login', async (c) => {
  const body = await c.req.json()
  const { email, password } = body

  const user = await c.env.DB.prepare(
    `SELECT * FROM users WHERE email = ? AND is_active = 1`
  ).bind(email).first<{ id: number, email: string, password_hash: string, role: string }>()

  if (!user) {
    return c.json({ success: false, message: '帳號不存在或已被停用' }, 401)
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash)
  if (!isPasswordValid) {
    return c.json({ success: false, message: '密碼錯誤' }, 401)
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 小時過期
  }

  const token = await sign(payload, c.env.JWT_SECRET, 'HS256')

  return c.json({
    success: true,
    message: '登入成功',
    token: token,
    user: { id: user.id, email: user.email, role: user.role }
  })
})

export default auth