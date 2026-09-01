export interface ArticlePayload {
  slug: string;
  title: string;
  type: string;
  cover_image?: string;
  excerpt?: string;
  content: string;
  tags?: string[];
  github_url?: string;
  demo_url?: string;
  is_published?: boolean;
}


/**
 * 取得已發布的文章/作品列表，支持分頁、類型過濾
 * @param db D1Database 實例
 * @param type 文章類型過濾（可選）
 * @param limit 一頁的文章數量（預設 10）
 * @param offset 分頁偏移量（預設 0）
 * @returns 包含文章列表、總數和分頁資訊的物件
 */
export const getPublishedArticlesService = async (
  db: D1Database,
  type?: string,
  isPublished: number = 1,
  limit: number = 10,
  offset: number = 0
) => {
  // 建構 WHERE 條件
  let whereClause = `WHERE is_published = ?`;

  const params: (string | number)[] = [isPublished];

  if (type) {
    whereClause += ` AND type = ?`;
    params.push(type);
  }

  // 先取得總數量
  const countQuery = `SELECT COUNT(*) as total FROM articles ${whereClause}`;
  const countResult = await db.prepare(countQuery).bind(...params).first();
  const total = (countResult as any)?.total || 0;

  // 確保 limit 和 offset 為正整數
  const safeLimit = Math.max(1, Math.min(limit, 100)); // 最多 100 筆
  const safeOffset = Math.max(0, offset);

  // 取得分頁後的文章列表
  const articlesQuery = `
    SELECT id, slug, title, type, cover_image, excerpt, tags, view_count, published_at 
    FROM articles 
    ${whereClause}
    ORDER BY published_at DESC
    LIMIT ? OFFSET ?
  `;

  const { results } = await db
    .prepare(articlesQuery)
    .bind(...params, safeLimit, safeOffset)
    .all();

  const articles = results.map(row => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as string) : []
  }));

  return {
    data: articles,
    pagination: {
      total,
      limit: safeLimit,
      offset: safeOffset,
      page: Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

/**
 * 根據 slug 取得單篇文章詳細內容
 */
export const getArticleBySlugService = async (db: D1Database, slug: string) => {
  const query = `
    SELECT * 
    FROM articles 
    WHERE slug = ? AND is_published = 1
  `;
  const result = await db.prepare(query).bind(slug).first();

  if (result) {
    result.tags = result.tags ? JSON.parse(result.tags as string) : [];
  }
  
  return result;
};

/**
 * 新增文章內容
 */
export const createArticleService = async (db: D1Database, payload: ArticlePayload) => {
  const query = `
    INSERT INTO articles (slug, title, type, cover_image, excerpt, content, tags, github_url, demo_url, is_published, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *;
  `;
  
  const tagsStr = payload.tags ? JSON.stringify(payload.tags) : null;
  const isPublished = payload.is_published ? 1 : 0;
  // 如果設定為發布，就押上當前時間；否則為 null
  const publishedAt = isPublished ? new Date().toISOString() : null;

  const result = await db.prepare(query).bind(
    payload.slug, payload.title, payload.type, payload.cover_image || null,
    payload.excerpt || null, payload.content, tagsStr, 
    payload.github_url || null, payload.demo_url || null, 
    isPublished, publishedAt
  ).first();

  return result;
};

/**
 * 更新文章內容
 */
export const updateArticleService = async (db: D1Database, id: string, payload: ArticlePayload) => {
  const query = `
    UPDATE articles 
    SET slug = ?, title = ?, type = ?, cover_image = ?, excerpt = ?, content = ?, 
        tags = ?, github_url = ?, demo_url = ?, is_published = ?,
        published_at = CASE 
            WHEN ? = 1 AND published_at IS NULL THEN CURRENT_TIMESTAMP
            WHEN ? = 0 THEN NULL
            ELSE published_at 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *;
  `;
  
  const tagsStr = payload.tags ? JSON.stringify(payload.tags) : null;
  const isPublished = payload.is_published ? 1 : 0;

  const result = await db.prepare(query).bind(
    payload.slug, payload.title, payload.type, payload.cover_image || null,
    payload.excerpt || null, payload.content, tagsStr, 
    payload.github_url || null, payload.demo_url || null, 
    isPublished, 
    isPublished, // 供 CASE WHEN 的第一個條件判斷使用
    isPublished, // 供 CASE WHEN 的第二個條件判斷使用
    id
  ).first();

  return result;
};

/**
 * 移除文章
 */
export const deleteArticleService = async (db: D1Database, id: string) => {
  const query = `
    DELETE FROM articles 
    WHERE id = ?
    RETURNING id;
  `;
  
  // 執行刪除並回傳被刪除的 id
  const result = await db.prepare(query).bind(id).first();
  return result;
};
