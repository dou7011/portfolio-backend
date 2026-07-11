/**
 * 使用者模組 Service 層
 * 
 * 負責使用者帳號的 CRUD 與 RBAC 角色指派：
 * - getAllUsersService    ：查詢所有使用者及其角色（子查詢聚合為 JSON）
 * - getUserByIdService   ：查詢單一使用者及角色
 * - createUserService    ：新增使用者（PBKDF2 加密密碼、批次指派角色）
 * - updateUserService    ：更新啟用狀態、可選密碼與角色覆寫
 * - deleteUserService    ：刪除使用者（依賴 schema ON DELETE CASCADE 清理關聯）
 * - assignUserRolesService：內部共享函式，全量覆寫使用者角色（先刪後寫）
 * - fetchUsersFromDB     ：內部共享函式，動態組裝查詢 SQL 並解析結果
 */
import type { D1Database } from '@cloudflare/workers-types'
import { hashPassword } from '../../utils/crypto'
import { safeJsonParse } from '../../utils/safeJsonParse'

// 定義回傳的使用者型別（含角色陣列，不含密碼雜湊）
export type UserWithRoles = {
  id: number;
  email: string;
  /** 1 = 啟用，0 = 停用 */
  is_active: number;
  created_at: string;
  /** 使用者所屬角色陣列，例如 [{ id: 1, name: 'ADMIN' }] */
  roles: Array<{ id: number; name: string }>;
}

/**
 * 取得所有使用者與他們的角色關聯
 */
export const getAllUsersService = async (db: D1Database): Promise<UserWithRoles[]> => {
  // 🌟 修正：直接接住回傳的陣列變數 users
  const users = await fetchUsersFromDB(db);

  return users.map((user: any) => ({
    id: user.id,
    email: user.email,
    is_active: user.is_active,
    created_at: user.created_at,
    roles: safeJsonParse(user.roles_json, []),
  }));
}

/**
 * 取得單一使用者與角色資料
 */
export const getUserByIdService = async (db: D1Database, id: string): Promise<UserWithRoles | null> => {
  // 🌟 修正：直接接住回傳的陣列變數 users
  const users = await fetchUsersFromDB(db, id);

  if (!users || users.length === 0) return null;

  const user = users[0];
  // 注意：此處直接使用 JSON.parse（已確認 fetchUsersFromDB 一定回傳有效 JSON 字串）
  // 如需更嚴謹的容錯，可改為 safeJsonParse(user.roles_json, [])
  return {
    id: user.id,
    email: user.email,
    is_active: user.is_active,
    created_at: user.created_at,
    roles: JSON.parse(user.roles_json as string)
  };
}

/**
 * 新增使用者 (會自動將密碼進行 PBKDF2 加密)
 * @returns 回傳新建立的使用者 ID
 */
export const createUserService = async (db: D1Database, email: string, password: string, isActive: number, roleIds?: number[]) => {
  // 1. 檢查信箱是否已存在
  const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existingUser) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  // 2. 密碼加密
  const hashedPassword = await hashPassword(password);

  // 3. 寫入資料庫並利用 RETURNING 取得剛新增的 ID
  const { results } = await db.prepare(
    'INSERT INTO users (email, password_hash, is_active) VALUES (?, ?, ?) RETURNING id'
  ).bind(email, hashedPassword, isActive).all();

  const userId = results[0].id as number;

  // 4. 如果有傳入角色 ID，則為該使用者指派角色
  if (roleIds && roleIds.length > 0) {
    await assignUserRolesService(db, userId, roleIds);
  }
}

/**
 * 編輯使用者基本資料 (僅限：啟用狀態、可選密碼)
 */
export const updateUserService = async (db: D1Database, id: string, isActive: number, password?: string, roleIds?: number[]) => {
  // 1. 處理基本資料更新 (狀態與密碼)
  if (password && password.trim() !== '') {
    // 有傳密碼 -> 先呼叫 PBKDF2 工具加密，然後連同狀態一起更新
    const hashedPassword = await hashPassword(password);
    
    await db.prepare(
      'UPDATE users SET is_active = ?, password_hash = ? WHERE id = ?'
    ).bind(isActive, hashedPassword, id).run();
    
  } else {
    // 沒傳密碼 -> 只更新啟用狀態，不碰密碼欄位
    await db.prepare(
      'UPDATE users SET is_active = ? WHERE id = ?'
    ).bind(isActive, id).run();
  }
  
  // 2. 🌟 呼叫共享函式：如果編輯時有傳入新的角色陣列，直接覆寫樞紐表！
  if (roleIds && Array.isArray(roleIds)) {
    await assignUserRolesService(db, id, roleIds);
  }
}

/**
 * 移除使用者
 */
export const deleteUserService = async (db: D1Database, id: string) => {
  // 因為 schema 有設定 ON DELETE CASCADE，這裡刪除 users，
  // user_roles 裡面的相關紀錄會被 D1 資料庫自動清空，不留垃圾資料！
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}



/**
 * 核心共享函式
 */

// 全量覆寫使用者的角色樞紐表
const assignUserRolesService = async (db: D1Database, userId: string | number, roleIds: number[]) => {
  const statements = [];

  // 1. 先清空該使用者舊有的所有角色
  statements.push(
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').bind(userId)
  );

  // 2. 重新塞入新的角色
  if (roleIds && roleIds.length > 0) {
    for (const roleId of roleIds) {
      statements.push(
        db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').bind(userId, roleId)
      );
    }
  }

  // 3. 執行 D1 批次交易
  await db.batch(statements);
}

/**
 * 查詢使用者和角色關聯（動態組裝 SQL 與解析 JSON）
 */
const fetchUsersFromDB = async (db: D1Database, id?: string | number): Promise<any[]> => {
  // 基礎 SQL 語句
  let sql = `
    SELECT 
      u.id, 
      u.email, 
      u.is_active, 
      u.created_at,
      (
        SELECT json_group_array(json_object('id', r.id, 'name', r.name))
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = u.id
      ) AS roles_json
    FROM users u
  `;

  let stmt;

  // 🌟 動態判斷：如果有傳入 id，就拼接 WHERE 條件並綁定參數
  if (id !== undefined && id !== null) {
    sql += ' WHERE u.id = ?';
    stmt = db.prepare(sql).bind(id);
  } else {
    stmt = db.prepare(sql);
  }

  const { results } = await stmt.all();
  return results;
}
