import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { loginController, getMeController } from './auth.controller'
import type { AppEnv } from '../../types'

// Auth 模組路由：提供登入與當前使用者資訊兩個入口。
const auth = new Hono<AppEnv>({ strict: false })

// 公開登入端點，供前端取得 JWT。
auth.post('/login', loginController)
// 受保護端點，需先驗證 JWT 後才能取得目前使用者資料。
auth.get('/me', authGuard, getMeController)

export default auth