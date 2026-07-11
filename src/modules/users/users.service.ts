// Users 服務，負責使用者資料的 CRUD、角色綁定與密碼雜湊流程。
import type { D1Database } from '@cloudflare/workers-types'
import { hashPassword } from '../../utils/crypto'
import { safeJsonParse } from '../../utils/safeJsonParse'

export type UserWithRoles = {
  id: number
  email: string
  is_active: number
  created_at: string
  roles: Array<{ id: number; name: string }>
}

/**
 * 取得所有使用者與其角色關聯。
 */
export const getAllUsersService = async (db: D1Database): Promise<UserWithRoles[]> => {
  const users = await fetchUsersFromDB(db)
  return users.map((user: any) => ({
    id: user.id,
    email: user.email,
    is_active: user.is_active,
    created_at: user.created_at,
    roles: safeJsonParse(user.roles_json, []),
  }))
}

/**
 * 取得單一使用者與角色資料。
 */
export const getUserByIdService = async (db: D1Database, id: string): Promise<UserWithRoles | null> => {
  const users = await fetchUsersFromDB(db, id)
  if (!users || users.length === 0) return null

  const user = users[0]
  return {
    id: user.id,
    email: user.email,
    is_active: user.is_active,
    created_at: user.created_at,
    roles: safeJsonParse(user.roles_json, []),
  }
}

/**
 * 新增使用者，並加密密碼與指派角色。
 */
export const createUserService = async (db: D1Database, email: string, password: string, isActive: number, roleIds?: number[]) => {
  const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existingUser) {
    throw new Error('EMAIL_ALREADY_EXISTS')
  }

  const hashedPassword = await hashPassword(password)
  const { results } = await db.prepare(
    'INSERT INTO users (email, password_hash, is_active) VALUES (?, ?, ?) RETURNING id'
  ).bind(email, hashedPassword, isActive).all()

  const userId = results[0].id as number
  if (roleIds && roleIds.length > 0) {
    await assignUserRolesService(db, userId, roleIds)
  }
}

/**
 * 更新使用者基本資料（啟用狀態、密碼與角色）。
 */
export const updateUserService = async (db: D1Database, id: string, isActive: number, password?: string, roleIds?: number[]) => {
  if (password && password.trim() !== '') {
    const hashedPassword = await hashPassword(password)
    await db.prepare('UPDATE users SET is_active = ?, password_hash = ? WHERE id = ?').bind(isActive, hashedPassword, id).run()
  } else {
    await db.prepare('UPDATE users SET is_active = ? WHERE id = ?').bind(isActive, id).run()
  }

  if (roleIds && Array.isArray(roleIds)) {
    await assignUserRolesService(db, id, roleIds)
  }
}

/**
 * 移除使用者，關聯資料由資料庫 CASCADE 清理。
 */
export const deleteUserService = async (db: D1Database, id: string) => {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
}

const assignUserRolesService = async (db: D1Database, userId: string | number, roleIds: number[]) => {
  const statements = [] as any[]
  statements.push(db.prepare('DELETE FROM user_roles WHERE user_id = ?').bind(userId))

  for (const roleId of roleIds) {
    statements.push(db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').bind(userId, roleId))
  }

  await db.batch(statements)
}

const fetchUsersFromDB = async (db: D1Database, id?: string | number): Promise<any[]> => {
  let sql = `
    SELECT
      u.id,
      u.email,
      u.is_active,
      u.created_at,
      (
        SELECT COALESCE(json_group_array(json_object('id', r.id, 'name', r.name)), '[]')
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = u.id
      ) AS roles_json
    FROM users u
  `

  let stmt: any
  if (id !== undefined && id !== null) {
    sql += ' WHERE u.id = ?'
    stmt = db.prepare(sql).bind(id)
  } else {
    stmt = db.prepare(sql)
  }

  const { results } = await stmt.all()
  return results
}
