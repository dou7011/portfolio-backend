<<<<<<< HEAD
/**
 * 認證模組 Controller 層
 * 
 * 職責：處理 HTTP 請求格式驗證、呼叫 Service 層，並將結果轉換為 HTTP 回應。
 * 此層不含商業邏輯，只負責 I/O 的翻譯與錯誤映射。
 */
import { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { loginUserService } from './auth.service'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}
=======
import { Context } from 'hono'
import { loginUserService } from './auth.service'
import type { AppEnv } from '../../types'
import { fail, ok } from '../../utils/response'
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77

/**
 * 處理登入的 HTTP 請求與回應
 */
<<<<<<< HEAD
export const loginController = async (c: Context<{ Bindings: Bindings }>) => {
=======
export const loginController = async (c: Context<AppEnv>) => {
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
  const body = await c.req.json();
  const { email, password } = body;

  // 防呆驗證
  if (!email || !password) {
<<<<<<< HEAD
    return c.json({ success: false, message: '請提供信箱與密碼' }, 400);
=======
    return fail(c, 400, 'BAD_REQUEST', '請提供信箱與密碼');
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
  }

  try {
    // 將環境變數與參數傳遞給後台 Service
    const token = await loginUserService(c.env.DB, c.env.JWT_SECRET, email, password);
    
    // 成功，回傳 token
<<<<<<< HEAD
    return c.json({ success: true, message: '登入成功', token });
=======
    return ok(c, { message: '登入成功', data: { token } });
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77

  } catch (error: any) {
    // 根據丟出的錯誤類型，給予精準的 HTTP 狀態碼
    if (error.message === 'AUTH_FAILED') {
<<<<<<< HEAD
      return c.json({ success: false, message: '帳號或密碼錯誤' }, 401);
    }
    
    // 系統未知錯誤異常攔截
    return c.json({ success: false, message: '系統錯誤，請稍後再試' }, 500);
=======
      return fail(c, 401, 'UNAUTHORIZED', '帳號或密碼錯誤');
    }
    
    // 系統未知錯誤異常攔截
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤，請稍後再試');
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
  }
}

/**
 * 處理 /me 的 HTTP 請求與回應
 */
<<<<<<< HEAD
export const getMeController = async (c: Context) => {
=======
export const getMeController = async (c: Context<AppEnv>) => {
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
  // 直接從 Context 拿 authGuard 塞進去的 user 資料
  // 能進到這個 Controller，代表 authGuard 一定已經驗證通過了
  const user = c.get('user');

<<<<<<< HEAD
  return c.json({
    success: true,
=======
  return ok(c, {
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
    data: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions
    }
  });
}
