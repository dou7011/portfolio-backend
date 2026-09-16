import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { AppEnv } from '../types'
import { fail } from '../utils/response'
import { safeJsonParse } from '../utils/safeJsonParse'
import { getCookie } from 'hono/cookie'

const isValidJwtPayload = (payload: unknown, issuer: string, audience: string): payload is { id: number; iss: string; aud: string } => {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as Record<string, unknown>
  const id = candidate.id
  const iss = candidate.iss
  const aud = candidate.aud

  return (
    typeof iss === 'string' && iss === issuer &&
    typeof aud === 'string' && aud === audience &&
    typeof id === 'number' && Number.isInteger(id) && id > 0
  )
}

const authenticateUser = async (c: Context<AppEnv>) => {
  const token = getCookie(c, 'portfolio_auth')
  if (!token) {
    return fail(c, 401, 'UNAUTHORIZED', '未提供授權憑證')
  }

  try {
    const decodedPayload = await verify(token, c.env.JWT_SECRET, 'HS256')
    if (!isValidJwtPayload(decodedPayload, c.env.JWT_ISSUER, c.env.JWT_AUDIENCE)) {
      return fail(c, 401, 'UNAUTHORIZED', '憑證格式無效')
    }

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
    `).bind(userId).first<any>()

    if (!row) {
      return fail(c, 401, 'UNAUTHORIZED', '帳號不存在')
    }

    if (row.is_active === 0) {
      return fail(c, 403, 'FORBIDDEN', '帳號已被停用')
    }

    const roles = safeJsonParse<string[]>(row.roles_json || '[]', [])
    const permissions = safeJsonParse<string[]>(row.permissions_json || '[]', [])

    c.set('user', {
      id: Number(row.id),
      email: String(row.email),
      roles,
      permissions,
    })
    return null
  } catch {
    return fail(c, 401, 'UNAUTHORIZED', '憑證無效或已過期')
  }
}

// JWT 驗證中介層，負責檢查請求是否帶有有效的 Bearer token，並載入使用者角色與權限。
export const authGuard = async (c: Context<AppEnv>, next: Next) => {
  const errorResponse = await authenticateUser(c)
  if (errorResponse) return errorResponse
  await next()
}

// 可選的 JWT 驗證：公開請求可繼續，合法使用者仍會載入角色與權限。
export const optionalAuthGuard = async (c: Context<AppEnv>, next: Next) => {
  const token = getCookie(c, 'portfolio_auth')
  if (!token) {
    await next()
    return
  }

  const errorResponse = await authenticateUser(c)
  if (errorResponse) {
    return errorResponse
  }

  await next()
}