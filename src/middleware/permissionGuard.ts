import { Next, Context } from 'hono'
import type { AppEnv, AuthUser } from '../types'
import { fail } from '../utils/response'

/**
 * 動態權限校驗中介層 (支援多個權限，滿足其一即放行)
 * @param allowedPermissions 允許的權限清單 (例如: 'resume:read', 'resume:edit')
 */
export const permissionGuard = (...allowedPermissions: string[]) => {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;

    if (!user) {
      return fail(c, 401, 'UNAUTHORIZED', '未經身分驗證');
    }

    // 🌟 零資料庫消耗！直接檢查陣列中是否包含該權限
    const hasPermission = allowedPermissions.some(permission => 
      user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return fail(c, 403, 'FORBIDDEN', '權限不足，拒絕存取');
    }

    await next();
  };
};