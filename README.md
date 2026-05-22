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
├── src/                     # 源碼目錄
│   ├── index.ts             # Hono app 入口：設定 CORS、路由掛載
│   ├── middleware/
│   │   └── authGuard.ts     # JWT 權限中介層：驗證管理員 token
│   └── routes/
│       ├── auth.ts          # /api/auth 路由：登入與 /me 權限驗證
│       └── resume.ts        # /api/resume 路由：公開讀履歷、受保護更新
├── schema.sql               # D1 建表指令
├── seed.sql                 # 測試資料種子
├── wrangler.jsonc           # Cloudflare Workers / D1 綁定設定
├── package.json             # 依賴與開發腳本
└── README.md                # 專案說明
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

專案使用兩張表：

- `users`：儲存管理員帳號、密碼雜湊、角色與啟用狀態
- `resumes`：儲存多語系履歷內容，包含 `lang`、`title`、`summary`、`skills`、`experience`、`education`、`certifications`

## API 路由

| 方法 | 路徑 | 驗證 | 說明 |
| --- | --- | --- | --- |
| GET | `/` | 否 | 健康檢查，回傳服務運作狀態 |
| POST | `/api/auth/login` | 否 | 管理員登入，成功後回傳 JWT token |
| POST | `/api/auth/setup` | 否 | 初始化管理員帳號 (建立完畢後建議關閉此路由)。 |
| GET | `/api/auth/me` | 是 | 驗證目前 token 並回傳最新使用者資料 |
| GET | `/api/resume?lang=zh` | 否 | 讀取公開履歷資料，預設語系為 `zh` |
| PUT | `/api/resume` | 是 | 更新履歷資料，需要有效的管理員 token |

## 注意事項

- `PUT /api/resume` 會先經過 `authGuard`，因此 token 必須有效且帳號狀態為啟用、角色為 `ADMIN`。
- 履歷資料中的 `skills`、`experience`、`education`、`certifications` 以 JSON 字串儲存在 D1，讀取時會再轉回物件。
- CORS 已在 `src/index.ts` 全域啟用，目前白名單包含本機開發網址與前端正式網域。

## 部署

登入 Cloudflare 後即可部署：

```bash
npm run deploy
```

如果正式環境尚未建立 D1 資料表，請先套用 `schema.sql`，必要時再匯入 `seed.sql`。