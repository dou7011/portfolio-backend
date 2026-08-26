// 系統內所有可授權的權限常數，集中管理以避免散落在各處。
export const PERMISSIONS = {
  RESUME_UPDATE: 'resume:update',

  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  ROLES_DELETE: 'roles:delete',

  ARTICLE_WRITE: 'articles:write',
  ARTICLE_DELETE: 'articles:delete',

  PERMISSIONS_READ: 'permissions:read'
} as const
