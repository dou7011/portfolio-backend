import { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { loginUserService } from './auth.service'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

/**
 * 處理登入的 HTTP 請求與回應
 */
export const loginController = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.json();
  const { email, password } = body;

  // 防呆驗證
  if (!email || !password) {
    return c.json({ success: false, message: '請提供信箱與密碼' }, 400);
  }

  try {
    // 將環境變數與參數傳遞給後台 Service
    const token = await loginUserService(c.env.DB, c.env.JWT_SECRET, email, password);
    
    // 成功，回傳 token
    return c.json({ success: true, message: '登入成功', token });

  } catch (error: any) {
    // 根據丟出的錯誤類型，給予精準的 HTTP 狀態碼
    if (error.message === 'AUTH_FAILED') {
      return c.json({ success: false, message: '帳號或密碼錯誤' }, 401);
    }
    
    // 系統未知錯誤異常攔截
    return c.json({ success: false, message: '系統錯誤，請稍後再試' }, 500);
  }
}

/**
 * 處理 /me 的 HTTP 請求與回應
 */
export const getMeController = async (c: Context) => {
  // 直接從 Context 拿 authGuard 塞進去的 user 資料
  // 能進到這個 Controller，代表 authGuard 一定已經驗證通過了
  const user = c.get('user');

  return c.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions
    }
  });
}
