import type { Context } from 'hono'

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
  }
) => {
  return c.json(
    {
      success: true,
      ...(options?.message ? { message: options.message } : {}),
      ...(options?.data !== undefined ? { data: options.data } : {})
    },
    200
  )
}

export const created = (
  c: Context,
  options?: {
    data?: unknown
    message?: string
  }
) => {
  return c.json(
    {
      success: true,
      ...(options?.message ? { message: options.message } : {}),
      ...(options?.data !== undefined ? { data: options.data } : {})
    },
    201
  )
}
