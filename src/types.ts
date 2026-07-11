import type { D1Database } from '@cloudflare/workers-types'

/**
 * 經 authGuard 驗證後，注入到 Hono Context 的使用者資料。
 */
export type AuthUser = {
  id: number;
  email: string;
  roles: string[];
  permissions: string[];
}

/**
 * Cloudflare Workers 的環境綁定型別。
 */
export type AppBindings = {
  DB: D1Database;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

/**
 * 供控制器使用的資料庫綁定子集合。
 */
export type DbBindings = Pick<AppBindings, 'DB'>

/**
 * Hono app 的環境型別，讓 c.env 與 c.get() 都具有完整型別支援。
 */
export type AppEnv = {
  Bindings: AppBindings;
  Variables: {
    user: AuthUser;
  };
}