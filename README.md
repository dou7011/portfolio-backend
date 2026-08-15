# Portfolio Backend

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare%20D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

Portfolio Backend 是一個以 Cloudflare Workers + Hono 建立的輕量後端服務，主要用於個人作品集、簡歷網站與後台管理系統。專案結合 JWT 身分驗證、RBAC 權限控制、D1 資料庫與統一 API 回應格式，提供可直接延伸的後端基礎架構。

## 主要功能

- 使用者登入與 JWT 驗證
- RBAC 權限模型：users / roles / permissions / resume
- 使用者、角色與權限管理 CRUD
- 多語系履歷內容讀取與更新
- 統一錯誤處理與 API 回應格式
- Cloudflare D1 本地開發與部署整合

## 技術棧

- Runtime: Cloudflare Workers
- Framework: Hono
- Database: Cloudflare D1 (SQLite)
- Language: TypeScript
- Auth: JWT (HS256)
- Password hashing: Web Crypto PBKDF2

## 專案目錄

```text
portfolio-backend/
├── docs/
│   └── API_SPEC.md
├── scripts/
│   └── gen-seed-user.mjs
├── src/
│   ├── constants/
│   │   └── permissions.ts
│   ├── middleware/
│   │   ├── authGuard.ts
│   │   └── permissionGuard.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── permissions/
│   │   ├── resume/
│   │   ├── roles/
│   │   └── users/
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── logger.ts
│   │   ├── response.ts
│   │   └── safeJsonParse.ts
│   ├── index.ts
│   └── types.ts
├── .dev.vars
├── .gitignore
├── package.json
├── README.md
├── schema.sql
├── seed.sql
├── tsconfig.json
├── wrangler.jsonc
└── package-lock.json
```

## 安裝與啟動

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立本地 D1 資料表

```bash
npx wrangler d1 execute portfolio-db --local --file=./schema.sql
```

### 3. 匯入種子資料

```bash
npx wrangler d1 execute portfolio-db --local --file=./seed.sql
```

### 4. 設定 JWT Secret

建議使用 Wrangler Secret：

```bash
npx wrangler secret put JWT_SECRET
```

本機也可使用 `.dev.vars`，但請不要把真實機密提交到 Git。

### 5. 啟動開發伺服器

```bash
npm run dev
```

開發伺服器預設在：

```text
http://localhost:8787
```

## 可用腳本

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動 Cloudflare Workers 本地開發伺服器 |
| `npm run deploy` | 部署至 Cloudflare Workers |
| `npm run cf-typegen` | 產生 Cloudflare bindings 型別 |
| `npm run gen:seed-user` | 產生初始帳號的 password hash 與 seed SQL |

## 環境變數與 CORS

`wrangler.jsonc` 目前設定了：

- `DB`: D1 資料庫 binding
- `ALLOWED_ORIGINS`: 可接受的前端來源白名單

必要設定：

- `JWT_SECRET`
- `ALLOWED_ORIGINS`（若不使用 `wrangler.jsonc` 的 vars，請在部署環境中設定）

CORS 會在 `src/index.ts` 全域啟用，並依白名單判斷可接受來源。

## RBAC 權限模型

目前權限字串採用 `資源:動作` 規範：

- `resume:update`
- `users:read`
- `users:write`
- `users:delete`
- `roles:read`
- `roles:write`
- `roles:delete`
- `permissions:read`

預設角色：

- `SUPER_ADMIN`: 擁有全部權限
- `USER_ADMIN`: 管理 users / roles / permissions
- `CONTENT_EDITOR`: 只能更新履歷內容

詳細權限與路由要求請見 [docs/API_SPEC.md](./docs/API_SPEC.md)。

## API 概覽

| 方法 | 路徑 | 驗證 | 權限 | 說明 |
| --- | --- | --- | --- | --- |
| GET | `/` | 無 | 無 | 健康檢查 |
| POST | `/api/auth/login` | 無 | 無 | 登入並取得 JWT |
| GET | `/api/auth/me` | Bearer Token | 任何已登入使用者 | 取得目前登入者資料 |
| GET | `/api/resume/:lang` | 無 | 無 | 依語系取得履歷 |
| PUT | `/api/resume` | Bearer Token | `resume:update` | 更新履歷 |
| GET | `/api/users` | Bearer Token | `users:read` 或 `users:write` | 取得全部使用者 |
| GET | `/api/users/:id` | Bearer Token | `users:read` 或 `users:write` | 取得單一使用者 |
| POST | `/api/users` | Bearer Token | `users:write` | 建立使用者 |
| PUT | `/api/users/:id` | Bearer Token | `users:write` | 更新使用者 |
| DELETE | `/api/users/:id` | Bearer Token | `users:delete` | 刪除使用者 |
| GET | `/api/roles` | Bearer Token | `roles:read` 或 `roles:write` | 取得全部角色 |
| GET | `/api/roles/:id` | Bearer Token | `roles:read` 或 `roles:write` | 取得單一角色 |
| POST | `/api/roles` | Bearer Token | `roles:write` | 建立角色 |
| PUT | `/api/roles/:id` | Bearer Token | `roles:write` | 更新角色 |
| DELETE | `/api/roles/:id` | Bearer Token | `roles:delete` | 刪除角色 |
| GET | `/api/permissions` | Bearer Token | `permissions:read` | 取得權限清單 |

## 統一 API 回應格式

成功回應：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

錯誤回應：

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "錯誤描述"
}
```

常見錯誤碼：

- `BAD_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## API 文件

完整的 API 規格表、請求範例、錯誤碼與資料結構請見：

- [docs/API_SPEC.md](./docs/API_SPEC.md)

## 部署

```bash
npm run deploy
```

部署前請確認：

1. D1 schema 已建立
2. `JWT_SECRET` 已設定
3. CORS 白名單已更新為正式前端域名

## 授權與補充

目前專案尚未附帶 LICENSE。若要公開發佈，建議補上 LICENSE 檔案。

## 目前狀態

目前後端已具備：

- JWT 驗證與 RBAC 權限檢查
- 使用者 / 角色 / 權限 / 履歷 CRUD
- 統一 API 回應與錯誤封裝
- Cloudflare D1 與 Hono 整合

如果你要繼續擴充，下一步很適合加入：

- rate limiting
- API versioning
- request logging
- cache / optimization for auth permission queries
