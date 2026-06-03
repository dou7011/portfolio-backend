# Portfolio Backend

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare%20D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

![Portfolio Backend Cover](./docs/cover.svg)

Portfolio Backend 是一個專為個人作品集網站打造的後端 API 服務，核心目標是提供一套輕量、可維護、易於部署的管理後台基礎。專案以 Cloudflare Workers 作為執行環境，搭配 Hono 建立 API 架構，並使用 Cloudflare D1 儲存使用者、角色、權限與履歷資料。

此專案不只是單純的履歷讀取 API，而是包含登入驗證、RBAC 權限控管、後台資料維護、標準化 API 回應格式與模組化程式結構的完整後端基礎。若前端是作品集網站、履歷網站或小型管理後台，這個專案可以作為直接延伸的起點。

此專案主要提供：

- 管理員登入與 JWT 驗證
- 角色與權限控管（RBAC）
- 使用者管理（Users CRUD）
- 角色管理（Roles CRUD）
- 權限清單查詢（Permissions Read）
- 多語系履歷資料查詢與更新

適合作為個人作品集網站的後台服務，提供安全、模組化、可擴充的 API 基礎。

## 技術棧

- Runtime：Cloudflare Workers
- Framework：Hono
- Database：Cloudflare D1（SQLite）
- Language：TypeScript
- Authentication：JWT（HS256）
- Password Hashing：Web Crypto PBKDF2

## 專案特色

- 模組化架構：`auth`、`resume`、`users`、`roles`、`permissions`
- 中介層驗證鏈：`authGuard` + `permissionGuard`
- RBAC 權限模型：`users` <-> `roles` <-> `permissions`
- API 回應格式統一：
  - 成功：`{ success: true, message?, data? }`
  - 失敗：`{ success: false, code, message }`

### 架構說明

1. 前端透過 HTTP 呼叫 Workers API。
2. API 入口由 `src/index.ts` 統一掛載各模組路由。
3. 受保護路由先經過 `authGuard` 驗證 JWT，再由 `permissionGuard` 檢查權限。
4. controller 負責處理 request / response，service 負責商業邏輯與資料庫操作。
5. 所有模組共用 `response.ts` 統一 API 回應格式。

## 專案結構

```text
portfolio-backend/                     # 專案根目錄
├── .dev.vars                         # 本機開發環境變數（請勿提交真實密鑰）
├── .gitignore                        # Git 忽略規則
├── package.json                      # 專案腳本與依賴
├── package-lock.json                 # npm 版本鎖定檔
├── tsconfig.json                     # TypeScript 編譯設定
├── wrangler.jsonc                    # Cloudflare Workers 與 D1 綁定設定
├── schema.sql                        # 資料庫 schema 與索引
├── seed.sql                          # 初始化測試資料
├── README.md                         # 專案說明（本檔）
├── docs/                             # 文件與靜態資源
│   └── API_SPEC.md                   # 提供前端串接的完整 API 規格
└── src/                              # 應用程式原始碼
    ├── index.ts                      # App 入口：CORS 設定與路由掛載
    ├── types.ts                      # 共用型別（AppEnv、Bindings、AuthUser）
    ├── middleware/                   # Hono 中介層（驗證與授權）
    │   ├── authGuard.ts              # JWT 驗證與使用者權限載入
    │   └── permissionGuard.ts        # 權限檢查
    ├── modules/                      # 功能模組（路由、控制器、服務）
    │   ├── auth/                     # 登入與當前使用者資訊
    │   │   ├── auth.route.ts         # auth 模組路由定義
    │   │   ├── auth.controller.ts    # auth 請求/回應控制
    │   │   └── auth.service.ts       # auth 商業邏輯與資料庫操作
    │   ├── resume/                   # 履歷查詢與更新
    │   │   ├── resume.route.ts       # resume 模組路由定義
    │   │   ├── resume.controller.ts  # resume 請求/回應控制
    │   │   └── resume.service.ts     # resume 商業邏輯與資料庫操作
    │   ├── users/                    # 使用者管理
    │   │   ├── users.route.ts        # users 模組路由定義
    │   │   ├── users.controller.ts   # users 請求/回應控制
    │   │   └── users.service.ts      # users 商業邏輯與資料庫操作
    │   ├── roles/                    # 角色管理
    │   │   ├── roles.route.ts        # roles 模組路由定義
    │   │   ├── roles.controller.ts   # roles 請求/回應控制
    │   │   └── roles.service.ts      # roles 商業邏輯與資料庫操作
    │   └── permissions/              # 權限清單查詢
    │       ├── permissions.route.ts  # permissions 模組路由定義
    │       ├── permissions.controller.ts # permissions 請求/回應控制
    │       └── permissions.service.ts # permissions 商業邏輯與資料庫操作
    ├── constants/                    # 系統常數
    │   └── permissions.ts            # 系統權限常數定義（集中管理）
    └── utils/                        # 共用工具函式
        ├── crypto.ts                 # 密碼雜湊/驗證工具
        └── response.ts               # 統一回應格式 helper
```

## 資料庫設計

主要資料表：

- `users`：帳號資訊（`email`、`password_hash`、`is_active`）
- `roles`：角色定義
- `permissions`：權限定義
- `user_roles`：使用者與角色關聯
- `role_permissions`：角色與權限關聯
- `resumes`：多語系履歷資料

設計重點：

- `users.email` 唯一
- `resumes.lang` 唯一（每個語系一筆資料）
- 關聯表與高頻查詢欄位已建立索引，提升授權與查詢效能

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立本地 D1 資料表

```bash
npx wrangler d1 execute portfolio-db --local --file=./schema.sql
```

### 3. 匯入測試資料

```bash
npx wrangler d1 execute portfolio-db --local --file=./seed.sql
```

### 4. 設定 JWT Secret

建議使用 Wrangler Secret：

```bash
npx wrangler secret put JWT_SECRET
```

本機開發可使用 `.dev.vars`，但請勿提交真實敏感資訊到 GitHub。

### 5. 啟動開發伺服器

```bash
npm run dev
```

預設網址：`http://localhost:8787`

## 可用腳本

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動本地 Workers 開發伺服器 |
| `npm run deploy` | 部署至 Cloudflare Workers（含 minify） |
| `npm run cf-typegen` | 產生 Cloudflare bindings 型別 |
| `npm run gen:seed-user` | 互動產生第一位使用者的 `password_hash` 與 seed SQL 片段 |

### 產生 seed 用初始帳號密碼

```bash
npm run gen:seed-user
```

執行後會要求輸入 email 與密碼，並輸出：

- `saltHex:hashHex` 格式的 `password_hash`
- 可直接貼到 `seed.sql` 的 `INSERT` 片段

## 環境設定

`wrangler.jsonc` 目前主要綁定：

- `DB`：D1 Database Binding

必要環境變數：

- `JWT_SECRET`：JWT 簽章密鑰

## CORS 設定

專案於 `src/index.ts` 內全域啟用 CORS，並以白名單控管允許來源。

上線前請依前端部署網域更新白名單。

## API 一覽

完整前端串接規格請見 [docs/API_SPEC.md](./docs/API_SPEC.md)。

| 方法 | 路徑 | 驗證需求 | 說明 |
| --- | --- | --- | --- |
| GET | `/` | 無 | 健康檢查 |
| POST | `/api/auth/login` | 無 | 登入並取得 token（`data.token`） |
| GET | `/api/auth/me` | Bearer Token | 取得目前登入者資料 |
| GET | `/api/resume/:lang` | 無 | 依語系取得履歷（`zh` / `en`） |
| PUT | `/api/resume` | Bearer + `resume:update` | 更新履歷 |
| GET | `/api/users` | Bearer + (`users:read` 或 `users:write`) | 取得使用者列表 |
| GET | `/api/users/:id` | Bearer + (`users:read` 或 `users:write`) | 取得單一使用者 |
| POST | `/api/users` | Bearer + `users:write` | 建立使用者 |
| PUT | `/api/users/:id` | Bearer + `users:write` | 更新使用者 |
| DELETE | `/api/users/:id` | Bearer + `users:delete` | 刪除使用者 |
| GET | `/api/roles` | Bearer + (`roles:read` 或 `roles:write`) | 取得角色列表 |
| GET | `/api/roles/:id` | Bearer + (`roles:read` 或 `roles:write`) | 取得單一角色 |
| POST | `/api/roles` | Bearer + `roles:write` | 建立角色 |
| PUT | `/api/roles/:id` | Bearer + `roles:write` | 更新角色 |
| DELETE | `/api/roles/:id` | Bearer + `roles:delete` | 刪除角色 |
| GET | `/api/permissions` | Bearer + `permissions:read` | 取得系統權限列表 |

## RBAC 權限重設（2026-06）

本專案已將權限命名統一為 `資源:動作`，並使用複數資源名稱：

- `resume:update`
- `users:read`
- `users:write`
- `users:delete`
- `roles:read`
- `roles:write`
- `roles:delete`
- `permissions:read`

預設角色與責任範圍：

- `SUPER_ADMIN`：擁有全部權限
- `USER_ADMIN`：管理 users / roles / permissions（不含履歷內容維護）
- `CONTENT_EDITOR`：僅可更新履歷內容

若你要在既有資料庫重新套用新的權限模型，建議流程：

```bash
# 1) 重新建立本機 DB（開發環境最乾淨）
npx wrangler d1 execute portfolio-db --local --command="DROP TABLE IF EXISTS role_permissions; DROP TABLE IF EXISTS user_roles; DROP TABLE IF EXISTS permissions; DROP TABLE IF EXISTS roles; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS resumes;"

# 2) 重新套 schema 與 seed
npx wrangler d1 execute portfolio-db --local --file=./schema.sql
npx wrangler d1 execute portfolio-db --local --file=./seed.sql
```

若是正式環境，請先備份資料，再用 migration 腳本逐步更新，不建議直接 drop table。

## API 回應格式

### 成功回應

```json
{
  "success": true,
  "message": "可選",
  "data": {}
}
```

### 錯誤回應

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

## 驗證與授權流程

1. 前端呼叫 `POST /api/auth/login` 取得 JWT token
2. 受保護 API 以 `Authorization: Bearer <token>` 夾帶 token
3. `authGuard` 驗證 token 並載入使用者權限
4. `permissionGuard` 檢查路由所需權限

## 部署

```bash
npm run deploy
```

建議部署前檢查：

1. D1 schema 已套用
2. `JWT_SECRET` 已設定
3. CORS 白名單已更新為正式網域

## 授權條款

目前專案尚未附上 LICENSE。若要公開發佈，建議新增 `LICENSE` 檔案。