import { Context } from 'hono'
import { loginUserService } from './auth.service'
import type { AppEnv } from '../../types'
import { fail, ok } from '../../utils/response'

/**
 * 處理登入的 HTTP 請求與回應
 */
export const loginController = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const { email, password } = body;

  // 防呆驗證
  if (!email || !password) {
    return fail(c, 400, 'BAD_REQUEST', '請提供信箱與密碼');
  }

  try {
    // 將環境變數與參數傳遞給後台 Service
    const token = await loginUserService(c.env.DB, c.env.JWT_SECRET, email, password);
    
    // 成功，回傳 token
    return ok(c, { message: '登入成功', data: { token } });

  } catch (error: any) {
    // 根據丟出的錯誤類型，給予精準的 HTTP 狀態碼
    if (error.message === 'AUTH_FAILED') {
      return fail(c, 401, 'UNAUTHORIZED', '帳號或密碼錯誤');
    }
    
    // 系統未知錯誤異常攔截
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤，請稍後再試');
  }
}

/**
 * 處理 /me 的 HTTP 請求與回應
 */
export const getMeController = async (c: Context<AppEnv>) => {
  // 直接從 Context 拿 authGuard 塞進去的 user 資料
  // 能進到這個 Controller，代表 authGuard 一定已經驗證通過了
  const user = c.get('user');

  return ok(c, {
    data: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions
    }
  });
}
