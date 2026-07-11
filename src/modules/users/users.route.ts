import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import {
  getUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController,
} from './users.controller'

// Users 模組路由：管理使用者 CRUD 與角色綁定。
const users = new Hono()

// 所有使用者相關端點都先經過 JWT 驗證。
users.use('*', authGuard)

users.get('/', permissionGuard(PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE), getUsersController)
users.get('/:id', permissionGuard(PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE), getUserController)
users.post('/', permissionGuard(PERMISSIONS.USERS_WRITE), createUserController)
users.put('/:id', permissionGuard(PERMISSIONS.USERS_WRITE), updateUserController)
users.delete('/:id', permissionGuard(PERMISSIONS.USERS_DELETE), deleteUserController)

export default users