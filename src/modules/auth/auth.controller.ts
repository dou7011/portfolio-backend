// Auth 控制器，負責將 HTTP 請求轉成登入與當前使用者資料的回應。
import { Context } from 'hono'
import { loginUserService } from './auth.service'
import type { AppEnv } from '../../types'
import { logger } from '../../utils/logger'
import { fail, ok } from '../../utils/response'
import { parseJsonBody } from '../../utils/parseJsonBody'

/**
 * 處理登入的 HTTP 請求與回應。
 */
export const loginController = async (c: Context<AppEnv>) => {
  const body = await parseJsonBody<{ email?: string; password?: string }>(c)
  if (!body) {
    return fail(c, 400, 'BAD_REQUEST', '請提供有效的 JSON 請求內容')
  }

  const { email, password } = body

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password.trim()) {
    return fail(c, 400, 'BAD_REQUEST', '請提供信箱與密碼')
  }

  try {
    const token = await loginUserService(
      c.env.DB,
      c.env.JWT_SECRET,
      c.env.JWT_ISSUER,
      c.env.JWT_AUDIENCE,
      email,
      password
    )
    return ok(c, { message: '登入成功', data: { token } })
  } catch (error: any) {
    logger.error('loginController', error)
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