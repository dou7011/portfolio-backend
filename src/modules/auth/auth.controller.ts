// Auth 控制器，負責將 HTTP 請求轉成登入與當前使用者資料的回應。
import { Context } from 'hono'
import { loginUserService } from './auth.service'
import type { AppEnv } from '../../types'
import { fail, ok } from '../../utils/response'

/**
 * 處理登入的 HTTP 請求與回應。
 */
export const loginController = async (c: Context<AppEnv>) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  const { email, password } = body

  if (!email || !password) {
    return fail(c, 400, 'BAD_REQUEST', '請提供信箱與密碼')
  }

  try {
    const token = await loginUserService(c.env.DB, c.env.JWT_SECRET, email, password)
    return ok(c, { message: '登入成功', data: { token } })
  } catch (error: any) {
    if (error.message === 'AUTH_FAILED') {
      return fail(c, 401, 'UNAUTHORIZED', '帳號或密碼錯誤')
    }
    return fail(c, 500, 'INTERNAL_ERROR', '系統錯誤，請稍後再試')
  }
}

/**
 * 處理 /me 的 HTTP 請求與回應。
 */
export const getMeController = async (c: Context<AppEnv>) => {
  const user = c.get('user')

  return ok(c, {
    data: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    },
  })
}