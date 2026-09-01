import type { Context } from 'hono'

// API 回應格式的統一封裝，讓控制器與中介層回傳格式一致，方便前端串接。
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export const fail = (
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  code: ErrorCode,
  message: string
) => {
  return c.json({ success: false, code, message }, status)
}

export const ok = (
  c: Context,
  options?: {
    data?: unknown
    message?: string
    [key: string]: unknown
  }
) => {
  return c.json(
    {
      success: true,
      ...(options ?? {})
    },
    200
  )
}

export const created = (
  c: Context,
  options?: {
    data?: unknown
    message?: string
    [key: string]: unknown
  }
) => {
  return c.json(
    {
      success: true,
      ...(options ?? {})
    },
    201
  )
}
