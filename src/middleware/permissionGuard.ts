/**
 * RBAC 細粒度權限驗證中介層
 * 
 * 職責：
 * 在 authGuard 完成身份驗證後，進一步確認使用者是否擁有指定操作權限。
 * 採「OR 邏輯」：傳入多個權限時，只要滿足其中一項即放行。
 * 
 * 設計原則：
 * - 零資料庫查詢：直接比對 authGuard 已注入 Context 的 permissions 陣列
 * - 工廠函式模式：回傳 Hono 中介層，可搭配任意路由動態組合
 * 
 * 使用範例：
 *   route.get('/', authGuard, permissionGuard('user:read', 'user:edit'), controller)
 */
import { Next, Context } from 'hono'

type AuthUser = {
  id: number
  email: string
  roles: string[]
  /** 使用者擁有的所有細粒度操作權限（由 authGuard 查詢注入） */
  permissions: string[]
}

/**
 * 動態權限校驗中介層工廠（支援多個權限，滿足其一即放行）
 * @param allowedPermissions 允許通過的權限清單（OR 邏輯），例如 'resume:edit'
 * @returns Hono 中介層函式
 */
export const permissionGuard = (...allowedPermissions: string[]) => {
  return async (c: Context, next: Next) => {
    // authGuard 必須先執行，否則 user 不存在
    const user = c.get('user') as AuthUser | undefined;

    if (!user) {
      return c.json({ success: false, message: '未經身分驗證' }, 401);
    }

    // 直接比對 Context 中的 permissions 陣列，不需要額外查詢資料庫
    const hasPermission = allowedPermissions.some(permission => 
      user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return c.json({ 
        success: false, 
        message: '權限不足，拒絕存取' 
      }, 403);
    }

    await next();
  };
};