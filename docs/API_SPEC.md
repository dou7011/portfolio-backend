# Portfolio Backend API Spec

本文件依目前後端實作整理，可直接提供前端串接使用。

## 1. 基本資訊

- 本機開發 Base URL: `http://localhost:8787`
- API Base Path: `/api`
- Content-Type: `application/json`
- 認證方式: `Authorization: Bearer <JWT_TOKEN>`
- JWT 演算法: `HS256`
- Token 內容至少包含: `id`, `email`, `exp`
- Token 過期規則: 以台灣時間當天 24:00 為到期時間

## 2. CORS

目前允許的 Origin:

- `http://localhost:4200`
- `https://portfolio-frontend-4fl.pages.dev`

允許的 HTTP Methods:

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `OPTIONS`

允許的 Headers:

- `Content-Type`
- `Authorization`

伺服器啟用 `credentials: true`。

## 3. 統一回應格式

### 成功

```json
{
  "success": true,
  "message": "可選訊息",
  "data": {}
}
```

### 失敗

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "錯誤描述"
}
```

### 錯誤碼

- `BAD_REQUEST`: 請求參數或 body 不合法
- `UNAUTHORIZED`: 未登入、Token 缺失、Token 無效、Token 過期
- `FORBIDDEN`: 已登入但權限不足，或帳號停用
- `NOT_FOUND`: 查無資料
- `CONFLICT`: 唯一值衝突
- `INTERNAL_ERROR`: 伺服器內部錯誤

## 4. 資料模型

### 4.1 AuthUser

```json
{
  "id": 1,
  "email": "admin@example.com",
  "roles": ["SUPER_ADMIN"],
  "permissions": ["users:read", "users:write"]
}
```

### 4.2 User

```json
{
  "id": 1,
  "email": "admin@example.com",
  "is_active": 1,
  "created_at": "2026-06-02 09:00:00",
  "roles": [
    {
      "id": 1,
      "name": "SUPER_ADMIN"
    }
  ]
}
```

欄位說明:

- `is_active`: `1` 代表啟用，`0` 代表停用
- `roles`: 使用者目前綁定角色清單

### 4.3 Role

```json
{
  "id": 1,
  "name": "SUPER_ADMIN",
  "description": "超級管理員，擁有全部後台權限",
  "permissions": [
    {
      "id": 1,
      "action": "resume:update"
    }
  ]
}
```

### 4.4 Permission

```json
{
  "id": 1,
  "action": "resume:update",
  "description": "更新履歷資料"
}
```

### 4.5 Resume

```json
{
  "id": 1,
  "lang": "zh",
  "title": "林和泰的個人履歷",
  "summary": "簡介內容",
  "skills": [
    {
      "category": "程式語言",
      "items": ["Python", "TypeScript"]
    }
  ],
  "experience": [
    {
      "company": "公司名稱",
      "title": "職稱",
      "startDate": "2023/09",
      "endDate": "2026/09",
      "description": "工作描述"
    }
  ],
  "education": [
    {
      "school": "學校名稱",
      "degree": "學位",
      "startDate": "2022/09",
      "endDate": "2026/06"
    }
  ],
  "certifications": [
    {
      "name": "證照名稱",
      "credentialId": "ABC-123",
      "description": "證照說明"
    }
  ],
  "updated_at": "2026-06-02 09:00:00"
}
```

備註:

- `skills`, `experience`, `education`, `certifications` 在資料庫中儲存為 JSON 字串，API 回傳時會轉成 JSON 陣列
- 履歷結構目前未做更細的欄位驗證，前端送什麼陣列內容，後端就會原樣儲存

## 5. 認證與授權規則

### 5.1 Bearer Token

所有受保護 API 都需要 Header:

```http
Authorization: Bearer <token>
```

### 5.2 權限字串

- `resume:update`
- `users:read`
- `users:write`
- `users:delete`
- `roles:read`
- `roles:write`
- `roles:delete`
- `permissions:read`

### 5.3 預設角色

- `SUPER_ADMIN`: 所有權限
- `USER_ADMIN`: `users:*`, `roles:*`, `permissions:read`
- `CONTENT_EDITOR`: `resume:update`

## 6. API 詳細規格

### 6.1 健康檢查

#### GET /

- 認證: 無
- 權限: 無
- Query: 無
- Path Params: 無
- Request Body: 無

成功回應 `200 OK`

```text
Portfolio Backend 運作正常！
```

### 6.2 Auth

#### POST /api/auth/login

- 認證: 無
- 權限: 無

Request Body:

```json
{
  "email": "dou7011@gmail.com",
  "password": "your-password"
}
```

欄位說明:

- `email`: 必填，登入信箱
- `password`: 必填，登入密碼

成功回應 `200 OK`

```json
{
  "success": true,
  "message": "登入成功",
  "data": {
    "token": "<JWT_TOKEN>"
  }
}
```

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `email` 或 `password`
- `401 UNAUTHORIZED`: 帳號或密碼錯誤
- `500 INTERNAL_ERROR`: 系統錯誤

#### GET /api/auth/me

- 認證: Bearer Token
- 權限: 只要登入即可

Request Headers:

```http
Authorization: Bearer <JWT_TOKEN>
```

成功回應 `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "dou7011@gmail.com",
    "roles": ["SUPER_ADMIN"],
    "permissions": [
      "resume:update",
      "users:read",
      "users:write",
      "users:delete",
      "roles:read",
      "roles:write",
      "roles:delete",
      "permissions:read"
    ]
  }
}
```

可能錯誤:

- `401 UNAUTHORIZED`: 未提供 Token / Token 無效 / Token 過期 / 帳號不存在
- `403 FORBIDDEN`: 帳號已停用

### 6.3 Resume

#### GET /api/resume/:lang

- 認證: 無
- 權限: 無

Path Params:

- `lang`: 必填，只接受 `zh` 或 `en`

成功回應 `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "lang": "zh",
    "title": "林和泰的個人履歷",
    "summary": "我是林和泰...",
    "skills": [
      {
        "category": "程式語言",
        "items": ["Python", "JavaScript", "TypeScript"]
      }
    ],
    "experience": [],
    "education": [],
    "certifications": [],
    "updated_at": "2026-06-02 09:00:00"
  }
}
```

可能錯誤:

- `400 BAD_REQUEST`: `lang` 非 `zh` 或 `en`
- `404 NOT_FOUND`: 找不到對應語系資料
- `500 INTERNAL_ERROR`: 伺服器錯誤

#### PUT /api/resume

- 認證: Bearer Token
- 權限: `resume:update`

Request Headers:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

Request Body:

```json
{
  "lang": "zh",
  "title": "林和泰的個人履歷",
  "summary": "新的履歷摘要",
  "skills": [
    {
      "category": "程式語言",
      "items": ["Python", "TypeScript"]
    }
  ],
  "experience": [
    {
      "company": "向上國際科技股份有限公司",
      "title": "實習生",
      "startDate": "2023/09",
      "endDate": "2026/09",
      "description": "工作內容"
    }
  ],
  "education": [
    {
      "school": "國立勤益科技大學",
      "degree": "資訊工程系學士",
      "startDate": "2022/09",
      "endDate": "2026/06"
    }
  ],
  "certifications": [
    {
      "name": "Microsoft Azure AZ-900",
      "credentialId": "H558-0163",
      "description": "Microsoft Azure Fundamentals"
    }
  ]
}
```

欄位說明:

- `lang`: 必填，只接受 `zh` 或 `en`
- `title`: 建議必填，資料表為 `NOT NULL`
- `summary`: 可選
- `skills`: 可選，陣列
- `experience`: 可選，陣列
- `education`: 可選，陣列
- `certifications`: 可選，陣列

成功回應 `200 OK`

```json
{
  "success": true,
  "message": "履歷更新成功"
}
```

可能錯誤:

- `400 BAD_REQUEST`: `lang` 缺失或不合法
- `401 UNAUTHORIZED`: 未登入或 Token 無效
- `403 FORBIDDEN`: 權限不足或帳號停用
- `500 INTERNAL_ERROR`: 伺服器錯誤

### 6.4 Users

#### GET /api/users

- 認證: Bearer Token
- 權限: `users:read` 或 `users:write`
- Query: 無

成功回應 `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "dou7011@gmail.com",
      "is_active": 1,
      "created_at": "2026-06-02 09:00:00",
      "roles": [
        {
          "id": 1,
          "name": "SUPER_ADMIN"
        }
      ]
    }
  ]
}
```

備註:

- 目前沒有分頁、搜尋、排序 query 參數

可能錯誤:

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

#### GET /api/users/:id

- 認證: Bearer Token
- 權限: `users:read` 或 `users:write`

Path Params:

- `id`: 使用者 ID

成功回應 `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "dou7011@gmail.com",
    "is_active": 1,
    "created_at": "2026-06-02 09:00:00",
    "roles": [
      {
        "id": 1,
        "name": "SUPER_ADMIN"
      }
    ]
  }
}
```

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`: 查無使用者
- `500 INTERNAL_ERROR`

#### POST /api/users

- 認證: Bearer Token
- 權限: `users:write`

Request Body:

```json
{
  "email": "new-user@example.com",
  "password": "user-password",
  "isActive": 1,
  "roleIds": [2, 3]
}
```

欄位說明:

- `email`: 必填，需唯一
- `password`: 必填
- `isActive`: 必填，`1` 或 `0`
- `roleIds`: 可選，角色 ID 陣列；若有傳入會直接建立綁定

成功回應 `201 Created`

```json
{
  "success": true,
  "message": "使用者建立與角色指派成功！"
}
```

可能錯誤:

- `400 BAD_REQUEST`: 缺少必填欄位
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `409 CONFLICT`: `email` 已存在
- `500 INTERNAL_ERROR`

#### PUT /api/users/:id

- 認證: Bearer Token
- 權限: `users:write`

Path Params:

- `id`: 使用者 ID

Request Body:

```json
{
  "isActive": 1,
  "password": "optional-new-password",
  "roleIds": [1, 2]
}
```

欄位說明:

- `isActive`: 必填，`1` 或 `0`
- `password`: 可選；有傳且非空字串時才更新密碼
- `roleIds`: 可選；如果有傳陣列，會全量覆寫該使用者的角色綁定

成功回應 `200 OK`

```json
{
  "success": true,
  "message": "使用者與角色更新成功！"
}
```

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `id` 或 `isActive`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

#### DELETE /api/users/:id

- 認證: Bearer Token
- 權限: `users:delete`

Path Params:

- `id`: 使用者 ID

成功回應 `200 OK`

```json
{
  "success": true,
  "message": "使用者已成功移除！"
}
```

備註:

- 刪除使用者後，`user_roles` 會跟著資料庫外鍵 `ON DELETE CASCADE` 一併清除

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

### 6.5 Roles

#### GET /api/roles

- 認證: Bearer Token
- 權限: `roles:read` 或 `roles:write`

成功回應 `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SUPER_ADMIN",
      "description": "超級管理員，擁有全部後台權限",
      "permissions": [
        {
          "id": 1,
          "action": "resume:update"
        }
      ]
    }
  ]
}
```

可能錯誤:

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

#### GET /api/roles/:id

- 認證: Bearer Token
- 權限: `roles:read` 或 `roles:write`

Path Params:

- `id`: 角色 ID

成功回應 `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "SUPER_ADMIN",
    "description": "超級管理員，擁有全部後台權限",
    "permissions": [
      {
        "id": 1,
        "action": "resume:update"
      }
    ]
  }
}
```

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`: 查無角色
- `500 INTERNAL_ERROR`

#### POST /api/roles

- 認證: Bearer Token
- 權限: `roles:write`

Request Body:

```json
{
  "name": "CONTENT_EDITOR",
  "description": "內容編輯者",
  "permissionIds": [1]
}
```

欄位說明:

- `name`: 必填，角色名稱，需唯一
- `description`: 可選
- `permissionIds`: 可選，權限 ID 陣列

成功回應 `201 Created`

```json
{
  "success": true,
  "message": "角色建立與權限指派成功！"
}
```

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `name`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `409 CONFLICT`: 角色名稱已存在
- `500 INTERNAL_ERROR`

#### PUT /api/roles/:id

- 認證: Bearer Token
- 權限: `roles:write`

Path Params:

- `id`: 角色 ID

Request Body:

```json
{
  "name": "USER_ADMIN",
  "description": "帳號與 RBAC 管理者",
  "permissionIds": [2, 3, 4, 5, 6, 7, 8]
}
```

欄位說明:

- `name`: 必填
- `description`: 可選
- `permissionIds`: 可選；如果有傳陣列，會全量覆寫該角色的權限綁定

成功回應 `200 OK`

```json
{
  "success": true,
  "message": "角色更新與權限指派成功！"
}
```

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `id` 或 `name`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `409 CONFLICT`: 名稱與其他角色衝突
- `500 INTERNAL_ERROR`

#### DELETE /api/roles/:id

- 認證: Bearer Token
- 權限: `roles:delete`

Path Params:

- `id`: 角色 ID

成功回應 `200 OK`

```json
{
  "success": true,
  "message": "角色已成功移除！"
}
```

備註:

- 刪除角色後，`user_roles` 與 `role_permissions` 會因外鍵 `ON DELETE CASCADE` 自動清除

可能錯誤:

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

### 6.6 Permissions

#### GET /api/permissions

- 認證: Bearer Token
- 權限: `permissions:read`

成功回應 `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "action": "resume:update",
      "description": "更新履歷資料"
    }
  ]
}
```

可能錯誤:

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

## 7. 前端串接注意事項

### 7.1 Header 規則

- 除了 `GET /`、`POST /api/auth/login`、`GET /api/resume/:lang` 以外，其餘 API 都要帶 Bearer Token
- 有 request body 的請求要帶 `Content-Type: application/json`

### 7.2 欄位命名不一致處

- 使用者 API 的啟用狀態，request body 用 `isActive`，response 用 `is_active`
- 履歷資料內部欄位大多採前端常見 camelCase，例如 `startDate`, `endDate`, `credentialId`
- 角色與權限綁定採 `roleIds`, `permissionIds`

### 7.3 後端目前未提供的能力

- 沒有 refresh token 機制
- 沒有 logout API
- 沒有分頁、搜尋、排序 query
- 沒有欄位級 schema validation
- 沒有 OpenAPI / Swagger 文件

### 7.4 建議前端型別

```ts
type ApiSuccess<T> = {
  success: true
  message?: string
  data?: T
}

type ApiError = {
  success: false
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR'
  message: string
}
```