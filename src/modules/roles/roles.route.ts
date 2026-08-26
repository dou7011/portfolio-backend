import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import { 
  getRolesController, 
  getRoleController, 
  createRoleController, 
  updateRoleController, 
  deleteRoleController
} from './roles.controller'
import type { AppEnv } from '../../types'

// Roles 模組路由：提供角色與權限綁定的管理入口。
const roles = new Hono<AppEnv>({ strict: false })

// 全域套用 authGuard，確保角色管理的所有端點都需要登入。
roles.use('*', authGuard)


// 檢視角色列表 (需具備 roles:read, roles:write 其中一項權限即可)
roles.get('/', permissionGuard(PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_WRITE), getRolesController)

// 檢視單一角色 (需具備 roles:read, roles:write 其中一項權限即可)
roles.get('/:id', permissionGuard(PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_WRITE), getRoleController)

// 建立角色 (需具備 roles:write)
roles.post('/', permissionGuard(PERMISSIONS.ROLES_WRITE), createRoleController)

// 編輯角色 (需具備 roles:write)
roles.put('/:id', permissionGuard(PERMISSIONS.ROLES_WRITE), updateRoleController)

// 移除角色 (需具備 roles:delete)
roles.delete('/:id', permissionGuard(PERMISSIONS.ROLES_DELETE), deleteRoleController)

export default roles