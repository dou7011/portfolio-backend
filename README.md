# Portfolio Backend

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare%20D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

這個專案是個人作品集與後台管理系統的 API 層，採用 Cloudflare Workers + Hono + D1 架構，提供履歷資料、文章資料、權限管理與 JWT 驗證等功能。

## 目前架構

- Runtime: Cloudflare Workers
- Framework: Hono
- Database: Cloudflare D1 (SQLite)
- Auth: JWT + middleware guard
- Language: TypeScript
- Modules: auth / resume / users / roles / permissions / articles

## 專案結構

```text
portfolio-backend/
├── docs/                                  # API 規格與資料定義文件
│   └── API_SPEC.md                       # 後端路由、請求/回應範例與錯誤碼說明
├── scripts/                               # 開發輔助腳本
│   └── gen-seed-user.mjs                 # 產生管理員種子帳號雜湊與 SQL
├── src/                                   # Worker 專案主程式碼
│   ├── constants/                         # 共用常數
│   │   └── permissions.ts                 # RBAC 權限字串定義
│   ├── middleware/                        # 全域與路由級中介層
│   │   ├── authGuard.ts                   # JWT 驗證守衛
│   │   └── permissionGuard.ts             # 權限驗證守衛
│   ├── modules/                           # 功能模組
│   │   ├── articles/                      # 文章 / 作品 CRUD
│   │   │   ├── articles.controller.ts     # 文章控制器
│   │   │   ├── articles.route.ts          # 文章路由定義
│   │   │   └── articles.service.ts        # 文章查詢與操作邏輯
│   │   ├── auth/                          # 認證模組
│   │   │   ├── auth.controller.ts         # 登入 / me 控制器
│   │   │   ├── auth.route.ts              # `/api/auth` 路由
│   │   │   └── auth.service.ts            # 登入、JWT、使用者驗證邏輯
│   │   ├── permissions/                   # 權限查詢模組
│   │   │   ├── permissions.controller.ts  # 權限控制器
│   │   │   ├── permissions.route.ts       # 權限路由
│   │   │   └── permissions.service.ts     # 權限資料查詢
│   │   ├── resume/                        # 履歷 CRUD 模組
│   │   │   ├── resume.controller.ts       # 履歷讀寫控制器
│   │   │   ├── resume.route.ts            # `/api/resume` 路由
│   │   │   └── resume.service.ts          # 履歷資料庫邏輯
│   │   ├── roles/                         # 角色管理模組
│   │   │   ├── roles.controller.ts        # 角色控制器
│   │   │   ├── roles.route.ts             # 角色路由
│   │   │   └── roles.service.ts           # 角色 CRUD 邏輯
│   │   ├── users/                         # 使用者管理模組
│   │   │   ├── users.controller.ts        # 使用者控制器
│   │   │   ├── users.route.ts             # 使用者路由
│   │   │   └── users.service.ts           # 使用者 CRUD 邏輯
│   │   └── ...
│   ├── utils/                             # 共用工具函式
│   │   ├── crypto.ts                      # 密碼與雜湊工具
│   │   ├── logger.ts                      # 統一錯誤記錄
│   │   ├── response.ts                    # 統一成功/錯誤回應
│   │   └── safeJsonParse.ts               # 安全 JSON 解析
│   ├── index.ts                           # Hono app 入口與全域 CORS 設定
│   ├── types.ts                           # Cloudflare bindings 與 AppEnv 定義
│   └── ...
├── .gitignore                             # Git 忽略規則
├── .dev.vars                              # 本機環境變數（未提交）
├── package.json                           # 專案腳本與依賴
├── README.md                              # 專案說明文件
├── schema.sql                             # D1 資料表結構
├── seed.sql                               # 初始資料與種子資料
├── tsconfig.json                          # TypeScript 設定
├── wrangler.jsonc                         # Cloudflare Worker / D1 設定
├── package-lock.json                      # 依賴鎖定檔
└── ...
```

## 目前已實作功能

- 使用者登入與 JWT 認證
- 取得當前登入者資訊
- 履歷讀取與更新
- 使用者 / 角色 / 權限 CRUD
- 文章與作品內容 CRUD，支持分頁與類型過濾
- 公開文章列表與 slug 查詢
- RBAC 權限 guard
- 統一 API 回應格式與 CORS 設定

## 本機開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立資料表

```bash
npx wrangler d1 execute portfolio-db --local --file=./schema.sql
```

### 3. 匯入種子資料

```bash
npx wrangler d1 execute portfolio-db --local --file=./seed.sql
```

### 4. 設定環境變數

建立 `.dev.vars`：

```bash
JWT_SECRET=your-local-secret
```

若需要允許前端來源，請在 `wrangler.jsonc` 的 `ALLOWED_ORIGINS` 或部署環境變數中設定。

### 5. 啟動開發伺服器

```bash
npm run dev
```

預設本地地址：

```text
http://localhost:8787
```

## 可用腳本

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動 Cloudflare Workers 本地伺服器 |
| `npm run deploy` | 部署到 Cloudflare Workers |
| `npm run cf-typegen` | 產生 Cloudflare bindings 型別 |
| `npm run gen:seed-user` | 產生種子帳號用雜湊值與 SQL |
| `npm run typecheck` | 執行 TypeScript 型別檢查 |

## API 概覽

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/` | 健康檢查 |
| `POST` | `/api/auth/login` | 登入並取得 JWT |
| `GET` | `/api/auth/me` | 取得當前登入者資訊 |
| `GET` | `/api/resume/:lang` | 依語系取得履歷內容 |
| `PUT` | `/api/resume` | 更新履歷內容 |
| `GET` | `/api/users` | 取得使用者列表 |
| `GET` | `/api/users/:id` | 取得單一使用者 |
| `POST` | `/api/users` | 建立使用者 |
| `PUT` | `/api/users/:id` | 更新使用者 |
| `DELETE` | `/api/users/:id` | 刪除使用者 |
| `GET` | `/api/roles` | 取得角色列表 |
| `GET` | `/api/roles/:id` | 取得單一角色 |
| `POST` | `/api/roles` | 建立角色 |
| `PUT` | `/api/roles/:id` | 更新角色 |
| `DELETE` | `/api/roles/:id` | 刪除角色 |
| `GET` | `/api/permissions` | 取得權限列表 |
| `GET` | `/api/articles` | 取得已發布文章 / 作品列表（支持分頁） |
| `GET` | `/api/articles/:slug` | 依 slug 取得文章內容 |
| `POST` | `/api/articles` | 建立文章 / 作品 |
| `PUT` | `/api/articles/:id` | 更新文章 / 作品 |
| `DELETE` | `/api/articles/:id` | 刪除文章 / 作品 |

## 權限模型

目前採用 `resource:action` 的 RBAC 字串，例如：

- `resume:update`
- `users:read`
- `users:write`
- `users:delete`
- `roles:read`
- `roles:write`
- `roles:delete`
- `articles:write`
- `articles:delete`
- `permissions:read`

`permissionGuard` 會在各個 route 上檢查需求權限，並在未授權時攔截請求。

## API 文件

### 完整 API 規格

更完整的路由、回應格式、分頁資訊與錯誤碼請見：

- [docs/API_SPEC.md](./docs/API_SPEC.md)

## 注意事項

- 此專案只負責後端 API，不處理前端渲染。
- CORS 依 `ALLOWED_ORIGINS` 白名單限制來源。
- 不要將 `.dev.vars` 或實際機密提交至版本控制。

