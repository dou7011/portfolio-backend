// Roles 控制器，負責角色管理 API 的請求驗證與回應封裝。
import { Context } from 'hono'
import { 
  getAllRolesService, 
  getRoleByIdService,
  createRoleService, 
  updateRoleService, 
  deleteRoleService,
  assignRolePermissionsService 
} from './roles.service'
import type { DbBindings } from '../../types'
import { fail, ok, created } from '../../utils/response'

/**
 * 處理讀取角色列表的 HTTP 請求與回應
 */
export const getRolesController = async (c: Context<{ Bindings: DbBindings }>) => {
  try {
    const roles = await getAllRolesService(c.env.DB);
    return ok(c, { data: roles });
  } catch (error: any) {
    console.error('🚨 [Get Roles Error]:', error.message);
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤');
  }
}

/**
 * 處理讀取單一角色的 HTTP 請求與回應
 */
export const getRoleController = async (c: Context<{ Bindings: DbBindings }>) => {
  const roleId = c.req.param('id');
  if (!roleId) {
    return fail(c, 400, 'BAD_REQUEST', '請提供角色 ID');
  }

  try {
    const role = await getRoleByIdService(c.env.DB, roleId);
    if (!role) {
      return fail(c, 404, 'NOT_FOUND', '找不到對應的角色');
    }

    return ok(c, { data: role });
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '獲取角色失敗');
  }
}

/**
 * 處理建立角色和權限指派的 HTTP 請求與回應
 */
export const createRoleController = async (c: Context<{ Bindings: DbBindings }>) => {
  const body = await c.req.json<{ name: string, description?: string , permissionIds?: number[] }>();
  if (!body.name) return fail(c, 400, 'BAD_REQUEST', '角色名稱為必填');

  try {
    await createRoleService(c.env.DB, body.name, body.description, body.permissionIds);
    return created(c, { message: '角色建立與權限指派成功！' });
  } catch (error: any) {
    if (error.message === 'ROLE_ALREADY_EXISTS') return fail(c, 409, 'CONFLICT', '該角色名稱已存在');
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤');
  }
}

/**
 * 處理編輯角色和權限指派的 HTTP 請求與回應
 */
export const updateRoleController = async (c: Context<{ Bindings: DbBindings }>) => {
  const roleId = c.req.param('id');
  if (!roleId) return fail(c, 400, 'BAD_REQUEST', '請提供角色 ID');

  const body = await c.req.json<{ name: string, description?: string , permissionIds?: number[] }>();
  if (!body.name) return fail(c, 400, 'BAD_REQUEST', '角色名稱為必填');

  try {
    await updateRoleService(c.env.DB, roleId, body.name, body.description, body.permissionIds);
    return ok(c, { message: '角色更新與權限指派成功！' });
  } catch (error: any) {
    if (error.message === 'ROLE_ALREADY_EXISTS') return fail(c, 409, 'CONFLICT', '名稱與其他角色衝突');
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤');
  }
}

/**
 * 處理移除角色的 HTTP 請求與回應
 */
export const deleteRoleController = async (c: Context<{ Bindings: DbBindings }>) => {
  const roleId = c.req.param('id');
  if (!roleId) return fail(c, 400, 'BAD_REQUEST', '請提供角色 ID');

  try {
    await deleteRoleService(c.env.DB, roleId);
    return ok(c, { message: '角色已成功移除！' });
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤');
  }
}
