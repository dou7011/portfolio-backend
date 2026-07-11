# Portfolio Backend

這是一個為個人作品集與履歷網站設計的後端 API，使用 Hono 建構，部署在 Cloudflare Workers，並以 Cloudflare D1 作為資料庫。專案提供登入驗證、JWT 權限控管，以及履歷資料的公開讀取與後台更新。

## 技術棧

- Hono
- Cloudflare Workers
- Cloudflare D1
- TypeScript
- JWT 驗證與 bcrypt 密碼雜湊

## 專案結構

```text
portfolio-backend/
├── src/                          # 源碼目錄
│   ├── index.ts                  # Hono app 入口：設定 CORS、掛載所有路由模組
│   ├── types.ts                  # 全域共用型別定義（AuthUser、AppEnv）
│   ├── middleware/
│   │   ├── authGuard.ts          # JWT 驗證中介層：解析 token、查詢使用者角色與權限
│   │   └── permissionGuard.ts    # 動態 RBAC 中介層：依傳入的 action 清單進行細粒度授權
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.route.ts     # /api/auth 路由定義
│   │   │   ├── auth.controller.ts# 登入、/me 的 HTTP 請求與回應處理
│   │   │   └── auth.service.ts   # 登入核心邏輯：驗證密碼、簽發 JWT
│   │   ├── resume/
│   │   │   ├── resume.route.ts   # /api/resume 路由定義
│   │   │   ├── resume.controller.ts # 讀取、更新履歷的 HTTP 請求與回應處理
│   │   │   └── resume.service.ts # 履歷 DB 查詢與 UPSERT 邏輯
│   │   └── users/
│   │       ├── users.route.ts    # /api/users 路由定義
│   │       ├── users.controller.ts # 使用者 CRUD 的 HTTP 請求與回應處理
│   │       └── users.service.ts  # 使用者 DB 操作與角色指派邏輯
│   └── utils/
│       ├── crypto.ts             # PBKDF2 密碼雜湊與驗證工具（Web Crypto API）
│       └── safeJsonParse.ts      # 安全 JSON 解析工具，避免裸 JSON.parse 拋出 500
├── schema.sql                    # D1 建表指令（含 RBAC 相關表）
├── seed.sql                      # 測試資料種子
├── wrangler.jsonc                # Cloudflare Workers / D1 綁定與環境變數設定
├── package.json                  # 依賴與開發腳本
└── README.md                     # 專案說明
```

## 本地開發

1. 安裝依賴

```bash
npm install
```

2. 建立本地 D1 資料表

```bash
npx wrangler d1 execute portfolio-db --local --file=./schema.sql
```

3. 匯入測試資料

```bash
npx wrangler d1 execute portfolio-db --local --file=./seed.sql
```

4. 啟動開發伺服器

```bash
npm run dev
```

預設會在 `http://localhost:8787` 提供服務。

## 環境設定

`wrangler.jsonc` 目前已設定 D1 binding：

- binding: `DB`
- database name: `portfolio-db`

另外還需要設定 JWT 密鑰 `JWT_SECRET`，可透過 Cloudflare Workers secret 或環境變數提供。

## 資料表

專案共使用六張表，前五張構成 RBAC 授權體系：

| 資料表 | 說明 |
| --- | --- |
| `users` | 使用者帳號、PBKDF2 密碼雜湊、啟用狀態 |
| `roles` | 角色定義（例如 `ADMIN`） |
| `permissions` | 細粒度操作定義（例如 `resume:edit`、`user:delete`） |
| `user_roles` | 使用者 ↔ 角色 多對多樞紐表 |
| `role_permissions` | 角色 ↔ 權限 多對多樞紐表 |
| `resumes` | 多語系履歷內容，JSON 欄位儲存 `skills`、`experience`、`education`、`certifications` |

## API 路由

| 方法 | 路徑 | 驗證 | 說明 |
| --- | --- | --- | --- |
| GET | `/` | 否 | 健康檢查，回傳服務運作狀態 |
| POST | `/api/auth/login` | 否 | 管理員登入，成功後回傳 JWT token |
| GET | `/api/auth/me` | 是 | 驗證目前 token 並回傳最新使用者資料 |
| GET | `/api/resume/:lang` | 否 | 讀取公開履歷資料，`:lang` 為 `zh` 或 `en` |
| PUT | `/api/resume` | 是（`resume:edit`） | 更新履歷資料，需具備 `resume:edit` 權限 |
| GET | `/api/users` | 是（`user:read`） | 取得使用者列表 |
| GET | `/api/users/:id` | 是（`user:read`） | 取得單一使用者 |
| POST | `/api/users` | 是（`user:edit`） | 新增使用者並指派角色 |
| PUT | `/api/users/:id` | 是（`user:edit`） | 編輯使用者狀態、密碼與角色 |
| DELETE | `/api/users/:id` | 是（`user:delete`） | 刪除使用者（關聯資料由 CASCADE 自動清除） |

## 注意事項

- 所有 `/api/users/*` 與 `/api/resume` PUT 路由都必須先通過 `authGuard` JWT 驗證，再由 `permissionGuard` 進行細粒度 RBAC 授權。
- 履歷資料中的 `skills`、`experience`、`education`、`certifications` 以 JSON 字串儲存在 D1，讀取時透過 `safeJsonParse` 安全地轉回物件，避免髒資料導致整支 API 500。
- CORS 白名單由 `wrangler.jsonc` 的 `ALLOWED_ORIGINS` 環境變數控制，以逗號分隔多個來源，不需修改程式碼即可調整。
- 密碼採用 Web Crypto API PBKDF2（SHA-256，100,000 次疊代 + 隨機 salt），不依賴任何第三方套件。

## 部署

登入 Cloudflare 後即可部署：

```bash
npm run deploy
```

如果正式環境尚未建立 D1 資料表，請先套用 `schema.sql`，必要時再匯入 `seed.sql`。