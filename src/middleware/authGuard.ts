import { Next, Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { verify } from 'hono/jwt'

// 1. 外部環境綁定
type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

// 2. 跨中介層傳遞的變數型別
type Variables = {
  user: {
    id: number
    email: string
    roles: string[]
    permissions: string[]
  }
}

// 3. 🌟 Hono 官方標準的 Env 組裝方式
type HonoEnv = {
  Bindings: Bindings
  Variables: Variables
}

export const authGuard = async (c: Context<HonoEnv>, next: Next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: '未提供授權憑證' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const decodedPayload = await verify(token, c.env.JWT_SECRET, 'HS256') as { id: number }
    const userId = decodedPayload.id

    const { results } = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.is_active, 
        r.name AS role_name, 
        p.action AS permission_action
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = ?
    `).bind(userId).all();

    if (!results || results.length === 0) return c.json({ success: false, message: '帳號不存在' }, 401);

    const row = results[0] as any;
    if (row.is_active === 0) return c.json({ success: false, message: '帳號已被停用' }, 403);

    const roles = [...new Set(results.map((r: any) => r.role_name).filter(Boolean))];
    const permissions = [...new Set(results.map((r: any) => r.permission_action).filter(Boolean))];

    c.set('user', {
      id: Number(row.id),
      email: String(row.email),
      roles,
      permissions
    });

    await next();
  } catch (error) {
    return c.json({ success: false, message: '憑證無效或已過期' }, 401)
  }
}