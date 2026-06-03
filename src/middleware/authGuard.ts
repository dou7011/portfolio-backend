import { Next, Context } from 'hono'
import { verify } from 'hono/jwt'
import type { AppEnv } from '../types'
import { fail } from '../utils/response'

export const authGuard = async (c: Context<AppEnv>, next: Next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(c, 401, 'UNAUTHORIZED', '未提供授權憑證')
  }

  const token = authHeader.split(' ')[1]

  try {
    const decodedPayload = await verify(token, c.env.JWT_SECRET, 'HS256') as { id: number }
    const userId = decodedPayload.id

    const row = await c.env.DB.prepare(`
      SELECT 
        u.id,
        u.email,
        u.is_active,
        (
          SELECT COALESCE(json_group_array(DISTINCT r.name), '[]')
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id
        ) AS roles_json,
        (
          SELECT COALESCE(json_group_array(DISTINCT p.action), '[]')
          FROM user_roles ur
          JOIN role_permissions rp ON ur.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = u.id
        ) AS permissions_json
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `).bind(userId).first<any>();

    if (!row) return fail(c, 401, 'UNAUTHORIZED', '帳號不存在');

    if (row.is_active === 0) return fail(c, 403, 'FORBIDDEN', '帳號已被停用');

    const roles = JSON.parse(String(row.roles_json || '[]')) as string[];
    const permissions = JSON.parse(String(row.permissions_json || '[]')) as string[];

    c.set('user', {
      id: Number(row.id),
      email: String(row.email),
      roles,
      permissions
    });

    await next();
  } catch (error) {
    return fail(c, 401, 'UNAUTHORIZED', '憑證無效或已過期')
  }
}