import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
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

// 檢視使用者列表 (需具備 users:read, users:write 任一權限即可)
users.get('/', permissionGuard(PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE), getUsersController)

// 檢視單一使用者 (需具備 users:read, users:write 任一權限即可)
users.get('/:id', permissionGuard(PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE), getUserController)

// 建立使用者 (需具備 users:write)
users.post('/', permissionGuard(PERMISSIONS.USERS_WRITE), createUserController)

// 編輯使用者 (需具備 users:write)
users.put('/:id', permissionGuard(PERMISSIONS.USERS_WRITE), updateUserController)

// 移除使用者 (需具備 users:delete)
users.delete('/:id', permissionGuard(PERMISSIONS.USERS_DELETE), deleteUserController)

export default users