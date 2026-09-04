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
  // 1. 條件拆分 (精準控制每個區塊的連動邏輯)
  // ==========================================

  // [條件 A] 絕對總數：無過濾
  const baseWhereClause = `WHERE articles.is_published = ?`;
  const baseParams: (string | number)[] = [isPublished];

  // [條件 B] AllTags 清單：【僅受 Type 影響】，決定該分類下有哪些標籤
  let typeWhereClause = `WHERE articles.is_published = ?`;
  const typeParams: (string | number)[] = [isPublished];

  // [條件 C] 分類統計 (Categories)：受 Date, Tag 影響，【不受 Type 影響】
  let categoryWhereClause = `WHERE articles.is_published = ?`;
  const categoryParams: (string | number)[] = [isPublished];

  // [條件 D] 標籤統計 (Tags)：受 Type, Date 影響，【不受 Tag 影響】
  let tagsWhereClause = `WHERE articles.is_published = ?`;
  const tagsParams: (string | number)[] = [isPublished];

  // [條件 E] 文章列表與篩選後總數：受 Type, Date, Tag【所有條件】影響
  let whereClause = `WHERE articles.is_published = ?`;
  const params: (string | number)[] = [isPublished];

  // --- 處理 Type ---
  if (type) {
    typeWhereClause += ` AND articles.type = ?`;
    typeParams.push(type);

    tagsWhereClause += ` AND articles.type = ?`;
    tagsParams.push(type);

    whereClause += ` AND articles.type = ?`;
    params.push(type);
  }

  // --- 處理 Date ---
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

  // --- 處理 Tag ---
  if (tag) {
    categoryWhereClause += ` AND articles.tags LIKE ?`;
    categoryParams.push(`%${tag}%`);

    whereClause += ` AND articles.tags LIKE ?`;
    params.push(`%${tag}%`);
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);

  // ==========================================
  // 2. 構建並行 SQL 查詢
  // ==========================================

  // 查詢 1: 絕對資料總數 (不受任何條件影響)
  const totalAllQuery = `SELECT COUNT(*) as count FROM articles ${baseWhereClause}`;

  // 查詢 2: 篩選後資料總數 (用於分頁與全部文章計算)
  const filteredTotalQuery = `SELECT COUNT(*) as count FROM articles ${whereClause}`;

  // 查詢 3: 實際文章列表
  const articlesQuery = `
    SELECT id, slug, title, type, cover_image, excerpt, tags, view_count, published_at 
    FROM articles 
    ${whereClause}
    ORDER BY published_at DESC
    LIMIT ? OFFSET ?
  `;

  // 查詢 4: 分類統計 (加上 LEFT JOIN 確保未選中的分類顯示 0，而不是消失)
  const categoryAggregationsQuery = `
    WITH AllTypes AS (
      SELECT DISTINCT type AS category_name 
      FROM articles 
      WHERE type IS NOT NULL
    ),
    FilteredTypes AS (
      SELECT type AS category_name, COUNT(id) AS count
      FROM articles
      ${categoryWhereClause}
      GROUP BY type
    )
    SELECT AllTypes.category_name as name, COALESCE(FilteredTypes.count, 0) AS count
    FROM AllTypes
    LEFT JOIN FilteredTypes ON AllTypes.category_name = FilteredTypes.category_name
    ORDER BY count DESC, name ASC;
  `;

  // 查詢 5: 標籤統計
  const tagsAggregationsQuery = `
    WITH AllTags AS (
      SELECT DISTINCT value AS tag_name 
      FROM articles, json_each(articles.tags) 
      ${typeWhereClause} AND articles.tags IS NOT NULL
    ),
    FilteredTags AS (
      SELECT value AS tag_name, COUNT(articles.id) AS count
      FROM articles, json_each(articles.tags)
      ${tagsWhereClause} AND articles.tags IS NOT NULL
      GROUP BY value
    )
    SELECT AllTags.tag_name as name, COALESCE(FilteredTags.count, 0) AS count
    FROM AllTags
    LEFT JOIN FilteredTags ON AllTags.tag_name = FilteredTags.tag_name
    ORDER BY count DESC, name ASC;
  `;

  // ==========================================
  // 3. 執行查詢與回傳組合
  // ==========================================

  const [
    totalAllResult,
    filteredTotalResult,
    articlesResult, 
    tagsAggResult, 
    categoryAggResult
  ] = await Promise.all([
    db.prepare(totalAllQuery).bind(...baseParams).first(),
    db.prepare(filteredTotalQuery).bind(...params).first(),
    db.prepare(articlesQuery).bind(...params, safeLimit, safeOffset).all(),
    db.prepare(tagsAggregationsQuery).bind(...typeParams, ...tagsParams).all(),
    db.prepare(categoryAggregationsQuery).bind(...categoryParams).all()
  ]);

  const totalAll = (totalAllResult as any)?.count || 0;
  const totalFiltered = (filteredTotalResult as any)?.count || 0;

  const articles = articlesResult.results.map(row => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as string) : []
  }));

  return {
    data: articles,
    pagination: {
      totalFiltered: totalFiltered,   // 明確的：過濾後的文章總數 (例如 5 篇)
      totalAll: totalAll,             // 新增的：資料庫所有的文章總數 (例如 15 篇)
      limit: safeLimit,
      offset: safeOffset,
      page: Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.ceil(totalFiltered / safeLimit) // 分頁依據過濾後的數量計算
    },
    aggregations: {
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
