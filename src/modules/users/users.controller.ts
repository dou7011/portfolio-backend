/**
 * 使用者模組 Controller 層
 * 
 * 職責：處理 HTTP 請求輸入驗證、呼叫 Service 層，並將結果轉換為 HTTP 回應。
 * 
 * getUsersController   — GET /api/users，取得所有使用者列表
 * getUserController    — GET /api/users/:id，取得單一使用者
 * createUserController — POST /api/users，新增使用者
 * updateUserController — PUT /api/users/:id，編輯使用者
 * deleteUserController — DELETE /api/users/:id，刪除使用者
 */
import { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { 
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService
} from './users.service'

type Bindings = {
  DB: D1Database
}

/**
 * 處理讀取使用者列表的 HTTP 請求與回應
 */
export const getUsersController = async (c: Context<{ Bindings: Bindings }>) => {
  try {
    const formattedUsers = await getAllUsersService(c.env.DB);
    
    return c.json({ success: true, data: formattedUsers });
  } catch (error: any) {
    return c.json({ success: false, message: '獲取使用者失敗' }, 500);
  }
}

/**
 * 處理讀取單一使用者的 HTTP 請求與回應
 */
export const getUserController = async (c: Context<{ Bindings: Bindings }>) => {
  const userId = c.req.param('id');
  if (!userId) {
    return c.json({ success: false, message: '請提供使用者 ID' }, 400);
  }

  try {
    const user = await getUserByIdService(c.env.DB, userId);
    if (!user) {
      return c.json({ success: false, message: '找不到對應的使用者' }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (error: any) {
    return c.json({ success: false, message: '獲取使用者失敗' }, 500);
  }
}

/**
 * 處理建立使用者的 HTTP 請求與回應
 */
export const createUserController = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.json<{ email: string, password: string, isActive: number, roleIds?: number[] }>();

  if (!body.email || !body.password || body.isActive === undefined) {
    return c.json({ success: false, message: '請提供完整的必填欄位' }, 400);
  }

  try {
    await createUserService(c.env.DB, body.email, body.password, body.isActive, body.roleIds);
    return c.json({ success: true, message: '使用者建立與角色指派成功！' }, 201);
  } catch (error: any) {
    if (error.message === 'EMAIL_ALREADY_EXISTS') return c.json({ success: false, message: '該信箱已被註冊' }, 409);
    console.error('🚨 [Create User Error]:', error.message);
    return c.json({ success: false, message: '系統錯誤' }, 500);
  }
}

/**
 * 處理編輯使用者的 HTTP 請求與回應
 */
export const updateUserController = async (c: Context<{ Bindings: Bindings }>) => {
  const userId = c.req.param('id');
  if (!userId) return c.json({ success: false, message: '請提供使用者 ID' }, 400);

  const body = await c.req.json<{ isActive: number, password?: string, roleIds?: number[] }>();
  if (body.isActive === undefined) return c.json({ success: false, message: '請提供啟用狀態' }, 400);

  try {
    await updateUserService(c.env.DB, userId, body.isActive, body.password, body.roleIds);
    return c.json({ success: true, message: '使用者與角色更新成功！' });
  } catch (error: any) {
    return c.json({ success: false, message: '更新失敗' }, 500);
  }
}

/**
 * 處理移除使用者的 HTTP 請求與回應
 */
export const deleteUserController = async (c: Context<{ Bindings: Bindings }>) => {
  const userId = c.req.param('id');
  if (!userId) {
    return c.json({ success: false, message: '請提供有效的使用者 ID' }, 400);
  }
  
  try {
    await deleteUserService(c.env.DB, userId);
    return c.json({ success: true, message: '使用者已成功移除！' });
  } catch (error: any) {
    return c.json({ success: false, message: '移除失敗' }, 500);
  }
}
