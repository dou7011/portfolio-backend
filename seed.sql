-- ==========================================
-- 1. 寫入角色資料 (Roles)
-- ==========================================
INSERT INTO roles (id, name, description) VALUES 
<<<<<<< HEAD
(1, 'ADMIN', '管理員，擁有系統最高權限'),
(2, 'HR', '人資面試官，可讀取隱藏資料');
=======
(1, 'SUPER_ADMIN', '超級管理員，擁有全部後台權限'),
(2, 'USER_ADMIN', '帳號與 RBAC 管理者（不含履歷內容維護）'),
(3, 'CONTENT_EDITOR', '內容編輯者（可維護履歷內容）');
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77


-- ==========================================
-- 2. 寫入權限明細資料 (Permissions)
-- ==========================================
INSERT INTO permissions (id, action, description) VALUES 
<<<<<<< HEAD
(1, 'resume:read', '讀取履歷資料'),
(2, 'resume:edit', '新增與修改履歷資料'),
(3, 'user:read', '讀取使用者資料'),
(4, 'user:edit', '編輯使用者資料'),
(5, 'user:delete', '刪除使用者資料'),
(6, 'blog:create', '發布部落格文章'),
(7, 'blog:edit', '編輯部落格文章'),
(8, 'blog:delete', '刪除部落格文章');
=======
(1, 'resume:update', '更新履歷資料'),
(2, 'users:read', '讀取使用者資料'),
(3, 'users:write', '建立與更新使用者'),
(4, 'users:delete', '刪除使用者'),
(5, 'roles:read', '讀取角色資料'),
(6, 'roles:write', '建立與更新角色及權限綁定'),
(7, 'roles:delete', '刪除角色'),
(8, 'permissions:read', '讀取權限清單');
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77


-- ==========================================
-- 3. 綁定角色擁有的權限 (Role-Permissions)
-- ==========================================
<<<<<<< HEAD
-- ADMIN (角色 1) 擁有所有權限 (1~5)
INSERT INTO role_permissions (role_id, permission_id) VALUES 
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5);

-- HR (角色 2) 只能讀履歷(1)
INSERT INTO role_permissions (role_id, permission_id) VALUES 
(2, 1);
=======
-- SUPER_ADMIN (角色 1) 擁有所有權限
INSERT INTO role_permissions (role_id, permission_id) VALUES 
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8);

-- USER_ADMIN (角色 2)：專注使用者/角色/權限管理
INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8);

-- CONTENT_EDITOR (角色 3)：僅維護履歷
INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1);
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77


-- ==========================================
-- 4. 寫入個人履歷資料 (Resumes)
-- ==========================================
-- 寫入中文版資料 (lang = 'zh')
INSERT INTO resumes (lang, title, summary, skills, experience, education, certifications)
VALUES (
  'zh',
  '林和泰的個人履歷',
  '        我是林和泰。過去擁有七年的機械領域經驗，因為對程式設計有極大的熱忱，我利用下班時間學習，後來決定轉換跑道進入勤益科大資訊工程系就讀。
        在學期間，我白天上班、夜間上課，更於大二起進入業界展開為期三年的實習。這段從硬體跨足軟體的歷程，不僅為我建構了全面的技術視野，更培養出我高度的自律與務實解決問題的能力。',
  '[{"category": "程式語言", "items": ["Python", "JavaScript", "TypeScript"]}, {"category": "前端技術", "items": ["HTML", "CSS", "Angular", "Vue"]}, {"category": "後端技術", "items": ["NestJS", "Flask"]}, {"category": "資料庫", "items": ["SQL Server", "MySQL", "Redis"]}, {"category": "開發與部署", "items": ["Docker"]}]',
  '[{"company": "向上國際科技股份有限公司", "title": "實習生", "startDate": "2023/09", "endDate": "2026/09", "description": "前期負責設備整備、資產管理與推行資安宣導，並學習機房、雲端服務與VM建置。後期投入全端開發。"}, {"company": "岳群機械有限公司", "title": "組立修配人員", "startDate": "2015/03", "endDate": "2022/07", "description": "負責客製化包裝機之組立與測試調校，具備機械故障排除與設備優化的實務能力。能獨立操作車床、銑床及氬焊，進行各式零件的加工與修配。"}]',
  '[{"school": "國立勤益科技大學", "degree": "資訊工程系學士", "startDate": "2022/09", "endDate": "2026/06"}]',
  '[{"name": "Microsoft Azure DP-100", "credentialId": "1093-1934", "description": "於 Azure 應用資料科學與機器學習技術，進行負載規劃及建立適合的開發環境。"}, {"name": "Microsoft Azure AZ-900", "credentialId": "H558-0163", "description": "熟悉雲端運算核心概念，具備Azure 基礎架構及服務之實作知識。"}]'
);

-- 寫入英文版資料 (lang = 'en')
INSERT INTO resumes (lang, title, summary, skills, experience, education, certifications)
VALUES (
  'en',
  'Ho-Tai Lin | Resume',
  '        My name is Ho-Tai Lin. I have seven years of experience in the mechanical field. Driven by a strong passion  for programming, I studied in my spare time and decided to change my career path by enrolling in  the CSIE department at NCUT.
        During my studies, I worked during the day and attended classes at night. Since my sophomore year, I have been engaged in a three-year industrial internship. In the early stage of my internship, I learned about server rooms, networking, and cloud services. In the second year, I officially transitioned into full-stack development.
        I enjoy modularizing repetitive functions to improve maintenance efficiency. This journey from hardware to software has built my strong self-discipline and practical problem-solving skills.',
  '[{"category": "Languages", "items": ["Python", "JavaScript", "TypeScript"]}, {"category": "Frontend", "items": ["HTML", "CSS", "Angular", "Vue"]}, {"category": "Backend", "items": ["NestJS", "Flask"]}, {"category": "Databases", "items": ["SQL Server", "MySQL", "Redis"]}, {"category": "Development & Deployment", "items": ["Docker"]}]',
  '[{"company": "Xiang Shang Games Co., Ltd.", "title": "Intern", "startDate": "2023/09", "endDate": "2026/09", "description": "Software Development: Participate in the full software development lifecycle (SDLC), utilizing Vue 3/Angular for frontend and NestJS/Flask for backend services. System Optimization: Design and implement modular functions to reduce code redundancy and improve system maintainability. Infrastructure: Manage IT assets and information security; deploy Virtual Machines (VM) and manage cloud services and server room operations."}, {"company": "YUEH CHYUN MACHINERY CO., LTD.", "title": "Assembly and Maintenance Technician", "startDate": "2015/03", "endDate": "2022/07", "description": "Equipment Assembly & Optimization: Assembled, tested, and optimized customized packaging machines, effectively troubleshooting complex mechanical issues. Precision Machining: Independently operated lathes, milling machines, and argon welding equipment to process, repair, and modify various mechanical components."}]',
  '[{"school": "National Chin-Yi University of Technology", "degree": "Bachelor of Science in Computer Science and Information Engineering", "startDate": "2022/09", "endDate": "2026/06"}]',
  '[{"name": "Microsoft Azure DP-100", "credentialId": "1093-1934", "description": "Designing and Implementing a Data Science Solution on Azure"}, {"name": "Microsoft Azure AZ-900", "credentialId": "H558-0163", "description": "Microsoft Azure Fundamentals"}]'
);


-- ==========================================
-- 5. 寫入第一位後台使用者 (請先用 npm run gen:seed-user 產生 hash)
-- ==========================================
-- 範例：
-- INSERT INTO users (email, password_hash, is_active)
-- VALUES ('admin@example.com', '請貼上產生的 saltHex:hashHex', 1);
--
-- 指派 SUPER_ADMIN 角色 (role_id = 1)
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT id, 1 FROM users WHERE email = 'admin@example.com';
