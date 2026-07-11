// Permissions 控制器，提供權限清單查詢的 HTTP 入口。
import { Context } from 'hono'
import { getAllPermissionsService } from './permissions.service'
import type { DbBindings } from '../../types'
import { fail, ok } from '../../utils/response'

/**
 * 處理獲取權限清單的 HTTP 請求與回應
 */
export const getPermissionsController = async (c: Context<{ Bindings: DbBindings }>) => {
  try {
    const permissions = await getAllPermissionsService(c.env.DB);
    return ok(c, { data: permissions });
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤，請稍後再試');
  }
}