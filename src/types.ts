import type { D1Database } from '@cloudflare/workers-types'

export type AuthUser = {
  id: number;
  email: string;
  roles: string[];
  permissions: string[];
}

export type AppBindings = {
  DB: D1Database;
  JWT_SECRET: string;
}

export type DbBindings = Pick<AppBindings, 'DB'>

export type AppEnv = {
  Bindings: AppBindings;
  Variables: {
    user: AuthUser;
  };
}