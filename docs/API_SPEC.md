# Portfolio Backend API Specifications

本文件整理目前實際的 API 實作，供前端或測試人員直接參照。內容以實際路由、控制器與權限檢查邏輯為準，不包含未落地的假設功能。

## 1. 基本資訊

- Base URL: http://localhost:8787
- API Prefix: /api
- Content-Type: application/json
- Authentication: Authorization: Bearer <JWT_TOKEN>
- JWT Algorithm: HS256
- CORS: 依 `wrangler.jsonc` 的 `ALLOWED_ORIGINS` 白名單設定

## 2. 統一回應格式

### 2.1 成功回應

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

### 2.2 錯誤回應

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "錯誤描述"
}
```

### 2.3 錯誤碼

- `BAD_REQUEST`: 缺少必要欄位、參數不合法
- `UNAUTHORIZED`: 未登入、Token 缺失、Token 無效或過期
- `FORBIDDEN`: 已登入但權限不足，或帳號被停用
- `NOT_FOUND`: 查無資料
- `CONFLICT`: 唯一值衝突（例如 email / role name 重複）
- `INTERNAL_ERROR`: 伺服器內部錯誤

## 3. 認證與授權

### 3.1 Bearer Token

所有受保護的 API 都須帶：

```http
Authorization: Bearer <token>
```

### 3.2 權限列表

目前系統定義的權限如下：

- `resume:update`
- `users:read`
- `users:write`
- `users:delete`
- `roles:read`
- `roles:write`
- `roles:delete`
- `permissions:read`

### 3.3 權限檢查規則

- `permissionGuard` 會接收一個或多個權限
- 只要符合其中任一權限即可放行
- 例：`permissionGuard(PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE)` 表示 `users:read` 或 `users:write` 都可存取

## 4. 角色與預設資料

預設角色：

- `SUPER_ADMIN`: 擁有全部權限
- `USER_ADMIN`: 擁有 `users:*`, `roles:*`, `permissions:read`
- `CONTENT_EDITOR`: 擁有 `resume:update`

預設權限對應：

- `resume:update`: 更新履歷內容
- `users:read`: 讀取使用者
- `users:write`: 建立 / 更新使用者
- `users:delete`: 刪除使用者
- `roles:read`: 讀取角色
- `roles:write`: 建立 / 更新角色
- `roles:delete`: 刪除角色
- `permissions:read`: 讀取權限列表

## 5. 端點總表

| Method | Path | Auth | Required Permission | 說明 |
| --- | --- | --- | --- | --- |
| GET | `/` | No | No | 健康檢查 |
| POST | `/api/auth/login` | No | No | 登入取得 JWT |
| GET | `/api/auth/me` | Yes | Any logged-in user | 取得目前登入者資料 |
| GET | `/api/resume/:lang` | No | No | 依語系取得履歷 |
| PUT | `/api/resume` | Yes | `resume:update` | 更新履歷 |
| GET | `/api/users` | Yes | `users:read` 或 `users:write` | 取得全部使用者 |
| GET | `/api/users/:id` | Yes | `users:read` 或 `users:write` | 取得單一使用者 |
| POST | `/api/users` | Yes | `users:write` | 建立使用者 |
| PUT | `/api/users/:id` | Yes | `users:write` | 更新使用者 |
| DELETE | `/api/users/:id` | Yes | `users:delete` | 刪除使用者 |
| GET | `/api/roles` | Yes | `roles:read` 或 `roles:write` | 取得全部角色 |
| GET | `/api/roles/:id` | Yes | `roles:read` 或 `roles:write` | 取得單一角色 |
| POST | `/api/roles` | Yes | `roles:write` | 建立角色 |
| PUT | `/api/roles/:id` | Yes | `roles:write` | 更新角色 |
| DELETE | `/api/roles/:id` | Yes | `roles:delete` | 刪除角色 |
| GET | `/api/permissions` | Yes | `permissions:read` | 取得權限列表 |

## 6. 資料型別

### 6.1 AuthUser

```json
{
  "id": 1,
  "email": "admin@example.com",
  "roles": ["SUPER_ADMIN"],
  "permissions": ["resume:update", "users:read"]
}
```

### 6.2 User

```json
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
```

### 6.3 Role

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

### 6.4 Permission

```json
{
  "id": 1,
  "action": "resume:update",
  "description": "更新履歷資料"
}
```

### 6.5 Resume

```json
{
  "id": 1,
  "lang": "zh",
  "title": "林和泰的個人履歷",
  "summary": "我是林和泰...",
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
      "description": "工作內容"
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
      "description": "說明"
    }
  ],
  "updated_at": "2026-06-02 09:00:00"
}
```

## 7. A. 健康檢查

### GET /

- 認證: 無
- 權限: 無

成功回應：

```text
Portfolio Backend 運作正常！
```

## 8. B. Auth

### 8.1 POST /api/auth/login

- 認證: 無
- 權限: 無

Request body:

```json
{
  "email": "dou7011@gmail.com",
  "password": "your-password"
}
```

成功回應：

```json
{
  "success": true,
  "message": "登入成功",
  "data": {
    "token": "<jwt-token>"
  }
}
```

可能錯誤：

- `400 BAD_REQUEST`: 缺少 email 或 password
- `401 UNAUTHORIZED`: 帳號或密碼錯誤
- `500 INTERNAL_ERROR`: 系統錯誤

### 8.2 GET /api/auth/me

- 認證: 必須帶 Bearer Token
- 權限: 任意已登入使用者

Request headers:

```http
Authorization: Bearer <jwt-token>
```

成功回應：

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

可能錯誤：

- `401 UNAUTHORIZED`: 未提供 Token / Token 無效 / 帳號不存在
- `403 FORBIDDEN`: 帳號已停用

## 9. C. Resume

### 9.1 GET /api/resume/:lang

- 認證: 無
- 權限: 無

Path params:

- `lang`: 必填，僅接受 `zh` 或 `en`

成功回應：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "lang": "zh",
    "title": "林和泰的個人履歷",
    "summary": "我是林和泰...",
    "skills": [],
    "experience": [],
    "education": [],
    "certifications": [],
    "updated_at": "2026-06-02 09:00:00"
  }
}
```

可能錯誤：

- `400 BAD_REQUEST`: `lang` 非 `zh` 或 `en`
- `404 NOT_FOUND`: 找不到對應語言資料
- `500 INTERNAL_ERROR`: 伺服器錯誤

### 9.2 PUT /api/resume

- 認證: 必須帶 Bearer Token
- 權限: `resume:update`

Request headers:

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

Request body:

```json
{
  "lang": "zh",
  "title": "林和泰的個人履歷",
  "summary": "新的簡介",
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
      "description": "工作內容"
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
      "name": "Azure AZ-900",
      "credentialId": "ABC-123",
      "description": "Azure Fundamentals"
    }
  ]
}
```

成功回應：

```json
{
  "success": true,
  "message": "履歷更新成功"
}
```

可能錯誤：

- `400 BAD_REQUEST`: `lang` 缺失或不合法
- `401 UNAUTHORIZED`: 未登入或 Token 無效
- `403 FORBIDDEN`: 權限不足或帳號停用
- `500 INTERNAL_ERROR`: 伺服器錯誤

## 10. D. Users

### 10.1 GET /api/users

- 認證: 必須帶 Bearer Token
- 權限: `users:read` 或 `users:write`

成功回應：

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

可能錯誤：

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

### 10.2 GET /api/users/:id

- 認證: 必須帶 Bearer Token
- 權限: `users:read` 或 `users:write`

Path params:

- `id`: 使用者 ID

成功回應：

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

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`: 查無使用者
- `500 INTERNAL_ERROR`

### 10.3 POST /api/users

- 認證: 必須帶 Bearer Token
- 權限: `users:write`

Request body:

```json
{
  "email": "new-user@example.com",
  "password": "user-password",
  "isActive": 1,
  "roleIds": [2, 3]
}
```

欄位說明：

- `email`: 必填，需唯一
- `password`: 必填
- `isActive`: 必填，`1` 或 `0`
- `roleIds`: 可選，角色 ID 陣列

成功回應：

```json
{
  "success": true,
  "message": "使用者建立與角色指派成功！"
}
```

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `email`、`password` 或 `isActive`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `409 CONFLICT`: email 已存在
- `500 INTERNAL_ERROR`

### 10.4 PUT /api/users/:id

- 認證: 必須帶 Bearer Token
- 權限: `users:write`

Request body:

```json
{
  "isActive": 1,
  "password": "new-password",
  "roleIds": [1, 2]
}
```

欄位說明：

- `isActive`: 必填，`1` 或 `0`
- `password`: 可選，若提供且非空字串才會更新
- `roleIds`: 可選，若有值會全量覆寫使用者角色綁定

成功回應：

```json
{
  "success": true,
  "message": "使用者與角色更新成功！"
}
```

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `isActive`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

### 10.5 DELETE /api/users/:id

- 認證: 必須帶 Bearer Token
- 權限: `users:delete`

成功回應：

```json
{
  "success": true,
  "message": "使用者已成功移除！"
}
```

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

## 11. E. Roles

### 11.1 GET /api/roles

- 認證: 必須帶 Bearer Token
- 權限: `roles:read` 或 `roles:write`

成功回應：

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

### 11.2 GET /api/roles/:id

- 認證: 必須帶 Bearer Token
- 權限: `roles:read` 或 `roles:write`

成功回應：

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

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`: 查無角色
- `500 INTERNAL_ERROR`

### 11.3 POST /api/roles

- 認證: 必須帶 Bearer Token
- 權限: `roles:write`

Request body:

```json
{
  "name": "CONTENT_EDITOR",
  "description": "內容編輯者",
  "permissionIds": [1]
}
```

欄位說明：

- `name`: 必填，角色名稱需唯一
- `description`: 可選
- `permissionIds`: 可選，權限 ID 陣列

成功回應：

```json
{
  "success": true,
  "message": "角色建立與權限指派成功！"
}
```

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `name`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `409 CONFLICT`: 角色名稱已存在
- `500 INTERNAL_ERROR`

### 11.4 PUT /api/roles/:id

- 認證: 必須帶 Bearer Token
- 權限: `roles:write`

Request body:

```json
{
  "name": "USER_ADMIN",
  "description": "帳號與 RBAC 管理者",
  "permissionIds": [2, 3, 4, 5, 6, 7, 8]
}
```

成功回應：

```json
{
  "success": true,
  "message": "角色更新與權限指派成功！"
}
```

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `id` 或 `name`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `409 CONFLICT`: 名稱與其他角色衝突
- `500 INTERNAL_ERROR`

### 11.5 DELETE /api/roles/:id

- 認證: 必須帶 Bearer Token
- 權限: `roles:delete`

成功回應：

```json
{
  "success": true,
  "message": "角色已成功移除！"
}
```

可能錯誤：

- `400 BAD_REQUEST`: 缺少 `id`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

## 12. F. Permissions

### 12.1 GET /api/permissions

- 認證: 必須帶 Bearer Token
- 權限: `permissions:read`

成功回應：

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

可能錯誤：

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `500 INTERNAL_ERROR`

## 13. 前端串接提醒

- 除了 `GET /`、`POST /api/auth/login`、`GET /api/resume/:lang` 以外，其餘 API 都需要帶 Bearer Token。
- 有 request body 的請求請附帶 `Content-Type: application/json`。
- 使用者 API 的 request body 使用 `isActive`，response 則是 `is_active`。
- 角色與權限綁定請使用 `roleIds` 與 `permissionIds`。
- 當前後端沒有 refresh token、logout API、分頁、搜尋或 Swagger/OpenAPI 文件。

## 14. 範例串接

### 登入

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dou7011@gmail.com","password":"your-password"}'
```

### 取得目前登入者資訊

```bash
curl http://localhost:8787/api/auth/me \
  -H 'Authorization: Bearer <jwt-token>'
```

### 取得履歷

```bash
curl http://localhost:8787/api/resume/zh
```

### 更新履歷

```bash
curl -X PUT http://localhost:8787/api/resume \
  -H 'Authorization: Bearer <jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "lang": "zh",
    "title": "我的履歷",
    "summary": "簡介",
    "skills": [],
    "experience": [],
    "education": [],
    "certifications": []
  }'
```

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