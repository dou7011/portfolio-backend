import type { D1Database } from '@cloudflare/workers-types'

export type AuthUser = {
  id: number;
  email: string;
  roles: string[];
  permissions: string[];
}

export type AppEnv = {
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
  Variables: {
    user: AuthUser;
  };
}