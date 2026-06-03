import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { loginController, getMeController } from './auth.controller'
import type { AppEnv } from '../../types'

const auth = new Hono<AppEnv>({ strict: false })

// 登入路由
auth.post('/login', loginController);

// 取得使用者資訊 API (讓前端守衛每次切換頁面時校驗)
auth.get('/me', authGuard, getMeController);

export default auth