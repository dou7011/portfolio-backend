import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { authGuard } from '../../middleware/authGuard'
import { loginController, getMeController } from './auth.controller'


type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>({ strict: false })

// 登入路由
auth.post('/login', loginController);

// 取得使用者資訊 API (讓前端守衛每次切換頁面時校驗)
auth.get('/me', authGuard, getMeController);

export default auth