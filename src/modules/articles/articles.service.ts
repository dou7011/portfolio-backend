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
  tag?: string,
  isPublished: number = 1,
  limit: number = 10,
  offset: number = 0,
  startTime?: string,
  endTime?: string
) => {
  // ==========================================
  // 1. 三層獨立的 WHERE 條件
  // ==========================================

  // [層級 1] 分類統計：僅受 Date 影響
  let categoryWhereClause = `WHERE articles.is_published = ?`;
  const categoryParams: (string | number)[] = [isPublished];

  // [層級 2] 標籤統計：受 Date, Type 影響
  let tagsWhereClause = `WHERE articles.is_published = ?`;
  const tagsParams: (string | number)[] = [isPublished];

  // [層級 3] 實際結果：受 Date, Type, Tag 所有條件影響
  let whereClause = `WHERE articles.is_published = ?`;
  const params: (string | number)[] = [isPublished];

  // --- 處理 Date (影響所有人) ---
  if (startTime) {
    categoryWhereClause += ` AND articles.published_at >= ?`;
    categoryParams.push(startTime);
    tagsWhereClause += ` AND articles.published_at >= ?`;
    tagsParams.push(startTime);
    whereClause += ` AND articles.published_at >= ?`;
    params.push(startTime);
  }

  if (endTime) {
    categoryWhereClause += ` AND articles.published_at <= ?`;
    categoryParams.push(endTime);
    tagsWhereClause += ` AND articles.published_at <= ?`;
    tagsParams.push(endTime);
    whereClause += ` AND articles.published_at <= ?`;
    params.push(endTime);
  }

  // --- 處理 Type (影響 Tags, Articles) ---
  if (type) {
    tagsWhereClause += ` AND articles.type = ?`;
    tagsParams.push(type);
    whereClause += ` AND articles.type = ?`;
    params.push(type);
  }

  // --- 處理 Tag (僅影響 Articles) ---
  if (tag) {
    whereClause += ` AND articles.tags LIKE ?`;
    params.push(`%${tag}%`);
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);

  // ==========================================
  // 2. 構建並行 SQL 查詢
  // ==========================================

  // 各自的總數量
  const categoriesTotalQuery = `SELECT COUNT(*) as count FROM articles ${categoryWhereClause}`;
  const tagsTotalQuery = `SELECT COUNT(*) as count FROM articles ${tagsWhereClause}`;
  const filteredTotalQuery = `SELECT COUNT(*) as count FROM articles ${whereClause}`;

  const articlesQuery = `
    SELECT id, slug, title, type, cover_image, excerpt, tags, view_count, published_at 
    FROM articles 
    ${whereClause}
    ORDER BY published_at DESC
    LIMIT ? OFFSET ?
  `;

  // 分類聚合 (保留 LEFT JOIN：讓日期區間內沒有文章的分類顯示 0，不消失)
  const categoryAggregationsQuery = `
    WITH AllTypes AS (
      SELECT DISTINCT type AS category_name FROM articles WHERE is_published = 1 AND type IS NOT NULL
    ),
    FilteredTypes AS (
      SELECT type AS category_name, COUNT(id) AS count FROM articles
      ${categoryWhereClause}
      GROUP BY type
    )
    SELECT AllTypes.category_name as name, COALESCE(FilteredTypes.count, 0) AS count
    FROM AllTypes
    LEFT JOIN FilteredTypes ON AllTypes.category_name = FilteredTypes.category_name
    ORDER BY count DESC, name ASC;
  `;

  // 標籤聚合 (極簡化：完全依照目前的 Type 與 Date 動態生成標籤，不補 0)
  const tagsAggregationsQuery = `
    SELECT value AS name, COUNT(articles.id) AS count
    FROM articles, json_each(articles.tags)
    ${tagsWhereClause} AND articles.tags IS NOT NULL
    GROUP BY value
    ORDER BY count DESC, name ASC;
  `;

  const [
    categoriesTotalResult,
    tagsTotalResult,
    filteredTotalResult,
    articlesResult,
    categoryAggResult,
    tagsAggResult
  ] = await Promise.all([
    db.prepare(categoriesTotalQuery).bind(...categoryParams).first(),
    db.prepare(tagsTotalQuery).bind(...tagsParams).first(),
    db.prepare(filteredTotalQuery).bind(...params).first(),
    db.prepare(articlesQuery).bind(...params, safeLimit, safeOffset).all(),
    db.prepare(categoryAggregationsQuery).bind(...categoryParams).all(),
    db.prepare(tagsAggregationsQuery).bind(...tagsParams).all()
  ]);

  const totalFiltered = (filteredTotalResult as any)?.count || 0;
  const articles = articlesResult.results.map(row => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as string) : []
  }));

  return {
    data: articles,
    pagination: {
      totalFiltered: totalFiltered,   
      limit: safeLimit,
      offset: safeOffset,
      page: Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.ceil(totalFiltered / safeLimit) || 1
    },
    aggregations: {
      totalCategories: (categoriesTotalResult as any)?.count || 0,
      totalTags: (tagsTotalResult as any)?.count || 0,             
      categories: categoryAggResult.results,
      tags: tagsAggResult.results 
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
