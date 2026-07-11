/**
 * 使用者模組路由定義
 * 
 * 掛載於 /api/users（由 src/index.ts 設定前綴）
 * 全部路由皆需通過 authGuard，再由 permissionGuard 進行細粒度授權。
 * 
 * 路由清單：
 * - GET    /api/users        — 需 user:read，取得所有使用者列表
 * - GET    /api/users/:id    — 需 user:read，取得單一使用者
 * - POST   /api/users        — 需 user:edit，新增使用者並指派角色
 * - PUT    /api/users/:id    — 需 user:edit，編輯使用者狀態、密碼與角色
 * - DELETE /api/users/:id    — 需 user:delete，刪除使用者（CASCADE 清除關聯資料）
 */
import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { 
  getUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController
} from './users.controller'

const users = new Hono()

// 全域套用 authGuard (讓這份路由底下所有的 API 都必須先登入)
users.use('*', authGuard)

// 檢視使用者列表 (需具備 user:read)
users.get('/', permissionGuard('user:read', 'user:edit'), getUsersController)

// 檢視單一使用者 (需具備 user:read)
users.get('/:id', permissionGuard('user:read', 'user:edit'), getUserController)

// 建立使用者 (需具備 user:edit)
users.post('/', permissionGuard('user:edit'), createUserController)

// 編輯使用者 (需具備 user:edit)
users.put('/:id', permissionGuard('user:edit'), updateUserController)

// 移除使用者 (需具備 user:delete)
users.delete('/:id', permissionGuard('user:delete'), deleteUserController)

export default users