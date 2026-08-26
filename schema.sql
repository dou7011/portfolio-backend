-- ===============================
-- Portfolio Backend 資料庫 Schema
-- 定義使用者、角色、權限與履歷資料的關聯結構。
-- ===============================

-- 使用者表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- 權限明細表
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL UNIQUE,
    description TEXT
);

-- 使用者與角色樞紐表 (使用者擁有多個角色)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 角色與權限樞紐表 (角色擁有哪些權限)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 履歷表
CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lang TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    skills TEXT,
    experience TEXT,
    education TEXT,
    certifications TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 效能優化索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- users 與 resumes 的高頻查詢欄位索引
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);


-- ==========================================
-- 部落格與作品集 (Articles & Portfolio)
-- ==========================================

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(100) NOT NULL UNIQUE,        -- 網址友善的英文識別碼，例如 'it-auth-service'
    title VARCHAR(200) NOT NULL,              -- 文章/專案標題
    type VARCHAR(50) NOT NULL DEFAULT 'blog', -- 類型分類：'blog' (技術文章) 或 'portfolio' (作品)
    cover_image VARCHAR(255),                 -- 封面圖 URL
    excerpt TEXT,                             -- 簡短摘要 (列表頁顯示用)
    content TEXT NOT NULL,                    -- Markdown 格式的正文
    tags TEXT,                                -- 技術標籤 (存 JSON 字串，例如 '["TypeScript", "Vue.js"]')
    github_url VARCHAR(255),                  -- GitHub 原始碼連結 (選填)
    demo_url VARCHAR(255),                    -- 實際運作的網站連結 (選填)
    view_count INTEGER DEFAULT 0,             -- 瀏覽次數 (可用於熱門文章排序)
    is_published BOOLEAN DEFAULT 0,           -- 狀態：0 (草稿), 1 (已發布)
    published_at DATETIME,                    -- 發布時間
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引加速查詢
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_type ON articles(type);
CREATE INDEX idx_articles_published ON articles(is_published);