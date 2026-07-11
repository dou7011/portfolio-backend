import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import { getPermissionsController } from './permissions.controller'

// Permissions 模組路由：提供權限清單查詢入口。
const permissions = new Hono()

// 全域套用 authGuard，僅允許已登入且具權限的使用者查詢。
permissions.use('*', authGuard)

// 檢視權限列表 (需具備 permissions:read 權限)
permissions.get('/', permissionGuard(PERMISSIONS.PERMISSIONS_READ), getPermissionsController)

export default permissions