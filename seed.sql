-- ==========================================
-- Portfolio Backend 初始資料種子
-- 這份檔案會建立基礎角色、權限與範例履歷資料。
-- ==========================================

-- 1. 寫入角色資料 (Roles)
INSERT OR IGNORE INTO roles (id, name, description) VALUES
(1, 'SUPER_ADMIN', '超級管理員，擁有全部後台權限'),
(2, 'USER_ADMIN', '帳號與 RBAC 管理者（不含履歷內容維護）'),
(3, 'CONTENT_EDITOR', '內容編輯者（可維護履歷內容）');

-- 2. 寫入權限明細資料 (Permissions)
INSERT OR IGNORE INTO permissions (id, action, description) VALUES
(1, 'resume:update', '更新履歷資料'),
(2, 'users:read', '讀取使用者資料'),
(3, 'users:write', '建立與更新使用者'),
(4, 'users:delete', '刪除使用者'),
(5, 'roles:read', '讀取角色資料'),
(6, 'roles:write', '建立與更新角色及權限綁定'),
(7, 'roles:delete', '刪除角色'),
(8, 'permissions:read', '讀取權限清單'),
(9, 'articles:write', '建立與更新文章'),
(10, 'articles:delete', '刪除文章');


-- 3. 綁定角色擁有的權限 (Role-Permissions)
-- SUPER_ADMIN (角色 1) 擁有所有權限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10);

-- USER_ADMIN (角色 2)：專注使用者/角色/權限管理
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8);

-- CONTENT_EDITOR (角色 3)：僅維護履歷
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
(3, 1);

-- 4. 寫入個人履歷資料 (Resumes)
INSERT OR IGNORE INTO resumes (lang, title, summary, skills, experience, education, certifications)
VALUES (
  'zh',
  '林和泰的個人履歷',
  '我是林和泰。過去擁有七年的機械領域經驗，因為對程式設計有極大的熱忱，我利用下班時間學習，後來決定轉換跑道進入勤益科大資訊工程系就讀。',
  '[{"category": "程式語言", "items": ["Python", "JavaScript", "TypeScript"]}, {"category": "前端技術", "items": ["HTML", "CSS", "Angular", "Vue"]}, {"category": "後端技術", "items": ["NestJS", "Flask"]}, {"category": "資料庫", "items": ["SQL Server", "MySQL", "Redis"]}, {"category": "開發與部署", "items": ["Docker"]}]',
  '[{"company": "向上國際科技股份有限公司", "title": "實習生", "startDate": "2023/09", "endDate": "2026/09", "description": "前期負責設備整備、資產管理與推行資安宣導，並學習機房、雲端服務與VM建置。後期投入全端開發。"}, {"company": "岳群機械有限公司", "title": "組立修配人員", "startDate": "2015/03", "endDate": "2022/07", "description": "負責客製化包裝機之組立與測試調校，具備機械故障排除與設備優化的實務能力。"}]',
  '[{"school": "國立勤益科技大學", "degree": "資訊工程系學士", "startDate": "2022/09", "endDate": "2026/06"}]',
  '[{"name": "Microsoft Azure DP-100", "credentialId": "1093-1934", "description": "於 Azure 應用資料科學與機器學習技術。"}, {"name": "Microsoft Azure AZ-900", "credentialId": "H558-0163", "description": "熟悉雲端運算核心概念。"}]'
);

INSERT OR IGNORE INTO resumes (lang, title, summary, skills, experience, education, certifications)
VALUES (
  'en',
  'Ho-Tai Lin | Resume',
  'My name is Ho-Tai Lin. I have seven years of experience in the mechanical field and later transitioned into software development.',
  '[{"category": "Languages", "items": ["Python", "JavaScript", "TypeScript"]}, {"category": "Frontend", "items": ["HTML", "CSS", "Angular", "Vue"]}, {"category": "Backend", "items": ["NestJS", "Flask"]}, {"category": "Databases", "items": ["SQL Server", "MySQL", "Redis"]}, {"category": "Development & Deployment", "items": ["Docker"]}]',
  '[{"company": "Xiang Shang Games Co., Ltd.", "title": "Intern", "startDate": "2023/09", "endDate": "2026/09", "description": "Contributed to full-stack development and cloud infrastructure tasks."}, {"company": "YUEH CHYUN MACHINERY CO., LTD.", "title": "Assembly and Maintenance Technician", "startDate": "2015/03", "endDate": "2022/07", "description": "Assembled and optimized customized packaging equipment."}]',
  '[{"school": "National Chin-Yi University of Technology", "degree": "Bachelor of Science in Computer Science and Information Engineering", "startDate": "2022/09", "endDate": "2026/06"}]',
  '[{"name": "Microsoft Azure DP-100", "credentialId": "1093-1934", "description": "Designing and Implementing a Data Science Solution on Azure"}, {"name": "Microsoft Azure AZ-900", "credentialId": "H558-0163", "description": "Microsoft Azure Fundamentals"}]'
);

-- 5. 寫入文章資料 (Articles)
-- 範例 1：實習作品展示
INSERT OR IGNORE INTO articles (slug, title, type, excerpt, content, tags, github_url, is_published, published_at)
VALUES 
(
    'it-auth-service', 
    'IT AuthService 集中式身分驗證與權限中心', 
    'portfolio', 
    '基於 Vue.js 與 TypeScript 打造的企業級前端認證模組，實作即時權限校驗。',
    '## 專案概述
這個系統整合了前端路由防護與後端權限驗證。

### 核心技術
* Vue.js
* TypeScript

### 解決方案
實作了登出與清空 localStorage 的集中管理，並確保每一次的動作都會打 API 確認最新的權限狀態，實現嚴謹的存取控制。', 
    '["Vue.js", "TypeScript", "RBAC", "Security"]', 
    'https://github.com/your-account/it-auth-service', 
    1, 
    CURRENT_TIMESTAMP
),
(
    'azure-data-scientist-associate', 
    'Microsoft Certified: Azure Data Scientist Associate 考照心得與實務分享', 
    'blog', 
    '分享我在準備 Azure 機器學習服務認證的過程，以及如何將資料科學應用於實際專案。',
    '## 認證動機
為了深化在資料科學領域的專業，並取得具公信力的技術認證。

### 準備重點
* 機器學習模型訓練與評估
* Azure Machine Learning 服務操作與部署', 
    '["Data Science", "Azure", "Certification"]', 
    NULL, 
    1, 
    CURRENT_TIMESTAMP
),
(
    'ncut-csie-project', 
    '勤益科大資工系 - 專題開發紀錄', 
    'blog', 
    '紀錄我在進修期間的系統開發與架構設計心路歷程。',
    '## 背景
在學校的專題中，我負責整體架構的規劃與前端實作。

### 學習成果
透過這個專案，我將課堂理論與實務開發進行了完美結合，特別是在前後端分離架構的掌握度上有大幅提升。', 
    '["NCUT", "Project", "Frontend"]', 
    NULL, 
    0, 
    NULL
);

-- 5. 寫入第一位後台使用者（請先用 npm run gen:seed-user 產生 hash）
-- 範例：
-- INSERT OR IGNORE INTO users (email, password_hash, is_active)
-- VALUES ('admin@example.com', '請貼上產生的 saltHex:hashHex', 1);
-- INSERT OR IGNORE INTO user_roles (user_id, role_id)
-- SELECT id, 1 FROM users WHERE email = 'admin@example.com';
