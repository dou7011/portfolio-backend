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
INSERT INTO articles (slug, title, type, excerpt, content, tags, github_url, is_published, published_at)
VALUES 
(
    'it-auth-service', 
    'IT AuthService 集中式身分驗證與權限中心', 
    'portfolio', 
    '基於 Vue.js 與 TypeScript 打造的企業級前端認證模組，實作即時權限校驗。',
    '## 專案概述\n這個系統整合了前端路由防護與後端權限驗證。\n\n### 解決方案\n實作了登出與清空 localStorage 的集中管理，並確保每一次的動作都會打 API 確認最新的權限狀態，實現嚴謹的存取控制。', 
    '["Vue.js", "TypeScript", "RBAC", "Security"]', 
    'https://github.com/your-account/it-auth-service', 
    1, 
    '2026-09-01 10:00:00'
),
(
    'azure-data-scientist-associate', 
    'Microsoft Certified: Azure Data Scientist Associate 考照心得與實務分享', 
    'blog', 
    '分享我在準備 Azure 機器學習服務認證的過程，以及如何將資料科學應用於實際專案。',
    '## 認證動機\n為了深化在資料科學領域的專業，並取得具公信力的技術認證。\n\n### 準備重點\n* 機器學習模型訓練與評估\n* Azure Machine Learning 服務操作與部署', 
    '["Data Science", "Azure", "Certification"]', 
    NULL, 
    1, 
    '2026-09-01 10:01:00'
),
(
    'ncut-csie-project', 
    '勤益科大資工系 - 專題開發紀錄', 
    'blog', 
    '紀錄我在進修期間的系統開發與架構設計心路歷程。',
    '## 背景\n在學校的專題中，我負責整體架構的規劃與前端實作。\n\n### 學習成果\n透過這個專案，我將課堂理論與實務開發進行了完美結合，特別是在前後端分離架構的掌握度上有大幅提升。', 
    '["NCUT", "Project", "Frontend"]', 
    NULL, 
    1, 
    '2026-09-01 10:02:00'
),
(
    'vue-typescript-best-practices', 
    'Vue.js 與 TypeScript 企業級專案實戰指南', 
    'blog', 
    '探討在大型專案中整合 Vue 裝飾器與 TS 型別定義的最佳實踐。',
    '## 核心概念\n在開發 NavBar.vue 等共用元件時，透過嚴謹的介面定義提升程式碼可維護性。', 
    '["Vue.js", "TypeScript", "Frontend"]', 
    NULL, 
    1, 
    '2026-09-01 10:03:00'
),
(
    'realtime-rbac-architecture', 
    '前端動態權限 (RBAC) 管理系統實作', 
    'portfolio', 
    '確保每一個操作皆透過 API 驗證的即時權限架構。',
    '## 架構設計\n放棄依賴過期的本地狀態，強制透過 /me endpoint 驗證最新的使用者權限與 Token。', 
    '["RBAC", "Security", "Vue.js"]', 
    NULL, 
    1, 
    '2026-09-01 10:04:00'
),
(
    'secure-localstorage-management', 
    '安全管理 LocalStorage 與前端登入狀態', 
    'blog', 
    '集中式管理 loginApi 與 logoutApi 的狀態清除邏輯。',
    '## 實作細節\n透過封裝的模組，一鍵完成 API 呼叫、清除 Token 與頁面跳轉。', 
    '["Frontend", "Security", "JavaScript"]', 
    NULL, 
    1, 
    '2026-09-01 10:05:00'
),
(
    'osaka-travel-2026', 
    '2026 大阪自由行：星宇航空與 Airbnb 住宿體驗', 
    'blog', 
    '七月前往日本大阪的自助旅行路線規劃與行前準備。',
    '## 行程規劃\n體驗星宇航空的服務，並分享在當地使用 Airbnb 尋找優質房源的技巧。', 
    '["Travel", "Osaka", "Japan"]', 
    NULL, 
    1, 
    '2026-09-01 10:06:00'
),
(
    'ipad-air-developer-setup', 
    'iPad Air (256GB) 與 Apple Pencil Pro 開發者日常應用', 
    'blog', 
    '紀錄入手新平板後的數位筆記與架構草圖繪製工作流。',
    '## 生產力提升\n取代紙本，在系統設計初期使用 Apple Pencil Pro 繪製 ER Model 與 UI 線框圖。', 
    '["Gadget", "Productivity", "Apple"]', 
    NULL, 
    1, 
    '2026-09-01 10:07:00'
),
(
    'google-ai-pro-coding', 
    '使用 Google AI Pro 加速前端元件開發', 
    'blog', 
    '分享訂閱 AI 服務後，在日常寫程式與除錯上的應用案例。',
    '## 實務應用\n讓 AI 協助生成繁瑣的 TypeScript 型別與撰寫單元測試。', 
    '["AI", "Development", "Productivity"]', 
    NULL, 
    1, 
    '2026-09-01 10:08:00'
),
(
    'dyson-hepa-filter-replacement', 
    'Dyson 吸塵器副廠 HEPA 濾網更換與清潔保養', 
    'blog', 
    '分享一月底購入副廠濾網的安裝過程與過濾效果評測。',
    '## 保養重點\n定期更換 HEPA 濾網能有效維持吸力並過濾微塵。', 
    '["Life", "Gadget", "Home"]', 
    NULL, 
    1, 
    '2026-09-01 10:09:00'
),
(
    'flea-prevention-home', 
    '居家環境防護：福來朗除蚤噴霧使用分享', 
    'blog', 
    '四月份進行居家環境清潔與除蚤對策紀錄。',
    '## 使用心得\n針對角落與縫隙的定期噴灑，能有效預防蟲害問題。', 
    '["Life", "Environment"]', 
    NULL, 
    1, 
    '2026-09-01 10:10:00'
),
(
    'api-design-auth-module', 
    '認證系統的 RESTful API 規格設計原則', 
    'blog', 
    '從前端開發者角度探討理想的後端登入/登出 API 結構。',
    '## 設計要點\n明確的 HTTP Status Code 與錯誤訊息結構，能大幅減少前後端對接成本。', 
    '["API", "Backend", "Architecture"]', 
    NULL, 
    1, 
    '2026-09-01 10:11:00'
),
(
    'vue-router-guards-auth', 
    'Vue Router 路由守衛實作登入攔截', 
    'blog', 
    '利用 beforeEach 勾子攔截未授權訪問，並整合 /me 權限驗證。',
    '## 實作指南\n避免無限迴圈跳轉的關鍵邏輯處理。', 
    '["Vue.js", "Frontend", "Router"]', 
    NULL, 
    1, 
    '2026-09-01 10:12:00'
),
(
    'azure-ml-model-deployment', 
    'Azure Machine Learning 模型雲端部署實戰', 
    'blog', 
    '將訓練好的資料科學模型封裝並部署至 Azure 容器實例。',
    '## 部署流程\n從環境建立、映像檔打包到 Endpoint 開放的完整紀錄。', 
    '["Azure", "Machine Learning", "Cloud"]', 
    NULL, 
    1, 
    '2026-09-01 10:13:00'
),
(
    'frontend-state-management', 
    '企業級 Vue 應用程式的狀態管理策略', 
    'blog', 
    '比較不同狀態管理工具在大型專案中的優劣與適用情境。',
    '## 核心比較\n如何在 Pinia 中妥善管理全域權限狀態與快取資料。', 
    '["Vue.js", "Frontend", "State Management"]', 
    NULL, 
    1, 
    '2026-09-01 10:14:00'
);

-- 5. 寫入第一位後台使用者（請先用 npm run gen:seed-user 產生 hash）
-- 範例：
-- INSERT OR IGNORE INTO users (email, password_hash, is_active)
-- VALUES ('admin@example.com', '請貼上產生的 saltHex:hashHex', 1);
-- INSERT OR IGNORE INTO user_roles (user_id, role_id)
-- SELECT id, 1 FROM users WHERE email = 'admin@example.com';
