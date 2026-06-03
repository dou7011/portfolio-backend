import { Context } from 'hono'
import { 
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService
} from './users.service'
import type { DbBindings } from '../../types'
import { fail, ok, created } from '../../utils/response'

/**
 * 處理讀取使用者列表的 HTTP 請求與回應
 */
export const getUsersController = async (c: Context<{ Bindings: DbBindings }>) => {
  try {
    const formattedUsers = await getAllUsersService(c.env.DB);
    
    return ok(c, { data: formattedUsers });
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '獲取使用者失敗');
  }
}

/**
 * 處理讀取單一使用者的 HTTP 請求與回應
 */
export const getUserController = async (c: Context<{ Bindings: DbBindings }>) => {
  const userId = c.req.param('id');
  if (!userId) {
    return fail(c, 400, 'BAD_REQUEST', '請提供使用者 ID');
  }

  try {
    const user = await getUserByIdService(c.env.DB, userId);
    if (!user) {
      return fail(c, 404, 'NOT_FOUND', '找不到對應的使用者');
    }

    return ok(c, { data: user });
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '獲取使用者失敗');
  }
}

/**
 * 處理建立使用者和角色指派的 HTTP 請求與回應
 */
export const createUserController = async (c: Context<{ Bindings: DbBindings }>) => {
  const body = await c.req.json<{ email: string, password: string, isActive: number, roleIds?: number[] }>();

  if (!body.email || !body.password || body.isActive === undefined) {
    return fail(c, 400, 'BAD_REQUEST', '請提供完整的必填欄位');
  }

  try {
    await createUserService(c.env.DB, body.email, body.password, body.isActive, body.roleIds);
    return created(c, { message: '使用者建立與角色指派成功！' });
  } catch (error: any) {
    if (error.message === 'EMAIL_ALREADY_EXISTS') return fail(c, 409, 'CONFLICT', '該信箱已被註冊');
    console.error('🚨 [Create User Error]:', error.message);
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤');
  }
}

/**
 * 處理編輯使用者和角色指派的 HTTP 請求與回應
 */
export const updateUserController = async (c: Context<{ Bindings: DbBindings }>) => {
  const userId = c.req.param('id');
  if (!userId) return fail(c, 400, 'BAD_REQUEST', '請提供使用者 ID');

  const body = await c.req.json<{ isActive: number, password?: string, roleIds?: number[] }>();
  if (body.isActive === undefined) return fail(c, 400, 'BAD_REQUEST', '請提供啟用狀態');

  try {
    await updateUserService(c.env.DB, userId, body.isActive, body.password, body.roleIds);
    return ok(c, { message: '使用者與角色更新成功！' });
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '更新失敗');
  }
}

/**
 * 處理移除使用者的 HTTP 請求與回應
 */
export const deleteUserController = async (c: Context<{ Bindings: DbBindings }>) => {
  const userId = c.req.param('id');
  if (!userId) {
    return fail(c, 400, 'BAD_REQUEST', '請提供有效的使用者 ID');
  }
  
  try {
    await deleteUserService(c.env.DB, userId);
    return ok(c, { message: '使用者已成功移除！' });
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '移除失敗');
  }
}
