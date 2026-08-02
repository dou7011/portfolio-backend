// Roles 服務，負責角色與權限關聯的建立、更新與查詢。
import type { D1Database } from '@cloudflare/workers-types'
import { safeJsonParse } from '../../utils/safeJsonParse'

export type RoleWithPermissions = {
  id: number;
  name: string;
  description: string | null;
  permissions: Array<{ id: number; action: string }>;
}

/**
 * 取得所有角色與他們的權限關聯 */
export const getAllRolesService = async (db: D1Database): Promise<RoleWithPermissions[]> => {
  const roles = await fetchRolesFromDB(db);
  return roles.map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: safeJsonParse(role.permissions_json, [])
  }));
}

/**
 * 取得單一角色與權限資料
 */
export const getRoleByIdService = async (db: D1Database, id: string): Promise<RoleWithPermissions | null> => {
  // 🌟 修正：直接接住回傳的陣列變數 roles
  const roles = await fetchRolesFromDB(db, id);

  if (!roles || roles.length === 0) return null;

  const role = roles[0];
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: safeJsonParse(role.permissions_json, [])
  };
}

/**
 * 新增角色
 */
export const createRoleService = async (db: D1Database, name: string, description?: string, permissionIds?: number[]): Promise<number> => {
  const existing = await db.prepare('SELECT id FROM roles WHERE name = ?').bind(name).first();
  if (existing) throw new Error('ROLE_ALREADY_EXISTS');

  const { results } = await db.prepare(
    'INSERT INTO roles (name, description) VALUES (?, ?) RETURNING id'
  ).bind(name, description || null).all();

  const roleId = results[0].id as number;

  // 如果有額外的權限 ID，則指派給角色
  if (permissionIds && permissionIds.length > 0) {
    await assignRolePermissionsService(db, roleId, permissionIds);
  }
  return results[0].id as number;
}

/**
 * 編輯角色基本資料 (僅限：名稱與描述)
 */
export const updateRoleService = async (db: D1Database, id: string, name: string, description?: string, permissionIds?: number[]) => {
  const existing = await db.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').bind(name, id).first();
  if (existing) throw new Error('ROLE_ALREADY_EXISTS');

  await db.prepare(
    'UPDATE roles SET name = ?, description = ? WHERE id = ?'
  ).bind(name, description || null, id).run();

  // 如果編輯時有傳入 permissionIds，採全量覆寫（可清空）
  if (Array.isArray(permissionIds)) {
    await assignRolePermissionsService(db, id, permissionIds);
  }
}

/**
 * 移除角色
 */
export const deleteRoleService = async (db: D1Database, id: string) => {
  // 依賴 D1 的 ON DELETE CASCADE 機制，自動清空 user_roles 與 role_permissions
  await db.prepare('DELETE FROM roles WHERE id = ?').bind(id).run();
}



/**
 * 核心共享函式
 */
// 指派權限給角色 (全量覆寫 role_permissions 樞紐表)
export const assignRolePermissionsService = async (db: D1Database, roleId: string | number, permissionIds: number[]) => {
  const statements = [];

  // 1. 先清空該角色舊有的權限關聯
  statements.push(
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').bind(roleId)
  );

  // 2. 重新塞入新權限
  if (permissionIds && permissionIds.length > 0) {
    for (const permId of permissionIds) {
      statements.push(
        db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)').bind(roleId, permId)
      );
    }
  }

  await db.batch(statements);
}

/**
 * 內部共享的私有底層查詢：動態抓取角色與權限
 */
const fetchRolesFromDB = async (db: D1Database, id?: string | number): Promise<any[]> => {
  let sql = `
    SELECT 
      r.id, 
      r.name, 
      r.description,
      (
        SELECT COALESCE(json_group_array(json_object('id', p.id, 'action', p.action)), '[]')
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = r.id
      ) AS permissions_json
    FROM roles r
  `;

  let stmt;
  if (id !== undefined && id !== null) {
    sql += ' WHERE r.id = ?';
    stmt = db.prepare(sql).bind(id);
  } else {
    stmt = db.prepare(sql);
  }

  const { results } = await stmt.all();
  return results;
}