import { Next, Context } from 'hono'
import type { AppEnv, AuthUser } from '../types'
import { fail } from '../utils/response'

/**
 * 動態權限校驗中介層，支援多個權限，滿足其一即放行。
 */
// 動態權限檢查中介層，依傳入的權限清單判斷使用者是否可進入特定端點。
export const permissionGuard = (...allowedPermissions: string[]) => {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user') as AuthUser | undefined

    if (!user) {
      return fail(c, 401, 'UNAUTHORIZED', '未經身分驗證')
    }

    const hasPermission = allowedPermissions.some(permission =>
      user.permissions.includes(permission)
    )

    if (!hasPermission) {
      return fail(c, 403, 'FORBIDDEN', '權限不足，拒絕存取')
    }

    await next()
  }
}