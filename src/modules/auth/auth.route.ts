<<<<<<< HEAD
/**
 * 認證模組路由定義
 * 
 * 掛載於 /api/auth（由 src/index.ts 設定前綴）
 * 
 * 路由清單：
 * - POST /api/auth/login  — 公開端點，驗證帳密並回傳 JWT
 * - GET  /api/auth/me     — 受保護端點，驗證 token 並回傳當前使用者資料
 */
import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { authGuard } from '../../middleware/authGuard'
import { loginController, getMeController } from './auth.controller'


type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>({ strict: false })
=======
import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { loginController, getMeController } from './auth.controller'
import type { AppEnv } from '../../types'

const auth = new Hono<AppEnv>({ strict: false })
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77

// 登入路由
auth.post('/login', loginController);

// 取得使用者資訊 API (讓前端守衛每次切換頁面時校驗)
auth.get('/me', authGuard, getMeController);

export default auth