# 🚀 Portfolio Backend (個人網站後端 API)

這是一個專為個人履歷與作品集網站打造的輕量級、無伺服器 (Serverless) 後端專案。
採用 **Hono** 框架建構，並部署於 **Cloudflare Workers** 邊緣運算環境，搭配 **Cloudflare D1** (SQLite) 作為資料庫，具備極佳的存取速度與零維護成本。

## ✨ 核心技術棧 (Tech Stack)

* **框架**: [Hono](https://hono.dev/) (超輕量 Edge 框架)
* **運行環境**: Cloudflare Workers
* **資料庫**: Cloudflare D1 (Serverless SQLite)
* **語言**: TypeScript
* **安全性**: JWT (JSON Web Tokens) 認證、Bcryptjs 密碼雜湊、全線 SQL 參數化查詢 (防禦 SQL Injection)

## 📁 專案目錄結構

```text
portfolio-backend/
├── src/
│   ├── index.ts          # 應用程式入口與全域路由/CORS 設定
│   ├── middleware/       
│   │   └── authGuard.ts  # JWT 權限守衛，即時驗證管理員狀態
│   └── routes/           
│       ├── auth.ts       # 認證相關 API (註冊/登入)
│       └── resume.ts     # 履歷資料 CRUD API
├── schema.sql            # D1 資料庫建表與初始資料腳本
├── wrangler.jsonc        # Cloudflare 核心環境與變數設定檔
└── package.json

## 🛠️ 本地開發環境設置 (Local Setup)

### 1. 安裝依賴套件
```bash
npm install
```

### 2. 初始化本地測試資料庫
專案使用 Cloudflare D1。在本地開發時，需先執行建表腳本來建立隱藏的 `.wrangler` 本地模擬庫：
```bash
npx wrangler d1 execute portfolio-db --local --file=./schema.sql
```

### 3. 啟動開發伺服器
```bash
npm run dev
```
伺服器將預設運行在 `http://localhost:8787`。

## 🔐 環境變數與設定 (Environment Variables)

請確保您的 `wrangler.jsonc` 中包含以下設定：
* **D1 Database Binding**: 確保 `database_id` 對應您在 Cloudflare 後台建立的專案 ID。
* **JWT_SECRET**: 用於簽發 Token 的密鑰，請在 `vars` 區塊中設定。

## 🗺️ API 路由文件 (API Documentation)

本專案採 RESTful API 設計，以下為開放之路由端點：

| 請求方法 | 端點路徑 (Endpoint) | 需驗證 (Auth) | 功能說明 |
| :--- | :--- | :---: | :--- |
| **GET** | `/` | 否 | 伺服器健康狀態檢查 (Health Check)。 |
| **POST** | `/api/auth/setup` | 否 | 初始化管理員帳號 (建立完畢後建議關閉此路由)。 |
| **POST** | `/api/auth/login` | 否 | 管理員登入，驗證成功後核發 24 小時效期的 JWT。 |
| **GET** | `/api/resume` | 否 | 取得公開的個人履歷 JSON 資料。 |
| **PUT** | `/api/resume` | **是 (Token)** | 更新履歷資料。需透過 `authGuard` 驗證 Token 及即時 `ADMIN` 權限。 |

## 🚀 部署至正式環境 (Deployment)

確認已使用 `npx wrangler login` 登入您的 Cloudflare 帳號後，執行以下指令即可一鍵部署至邊緣節點：
```bash
npm run deploy
```
*(注意：正式環境的資料表需透過 Cloudflare Dashboard 或 `--remote` 指令另外建立。)*