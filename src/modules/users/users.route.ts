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