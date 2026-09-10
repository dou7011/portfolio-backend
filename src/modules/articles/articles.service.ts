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
 * 取得已發布的文章/作品列表，支持分頁、類型過濾 (已最佳化 D1 Row Reads)
 */
export const getArticlesService = async (
  db: D1Database,
  type?: string,
  tag?: string,
  isPublished?: number,
  limit: number = 10,
  offset: number = 0,
  startTime?: string,
  endTime?: string
) => {
  let baseWhere = `WHERE 1=1`;
  const baseParams: (string | number)[] = [];

  if (isPublished !== undefined) {
    baseWhere += ` AND a.is_published = ?`;
    baseParams.push(isPublished);
  }
  if (startTime) {
    baseWhere += ` AND a.published_at >= ?`;
    baseParams.push(startTime);
  }
  if (endTime) {
    baseWhere += ` AND a.published_at <= ?`;
    baseParams.push(endTime);
  }

  // [層級 1] 分類統計條件
  const categoryWhere = baseWhere;
  const categoryParams = [...baseParams];

  // [層級 2] 標籤統計條件
  let tagsWhere = baseWhere;
  const tagsParams = [...baseParams];
  if (type) {
    tagsWhere += ` AND a.type = ?`;
    tagsParams.push(type);
  }

  // [層級 3] 實際文章結果條件
  let articlesWhere = tagsWhere;
  const articlesParams = [...tagsParams];
  if (tag) {
    articlesWhere += ` AND EXISTS (
      SELECT 1 FROM article_tags at 
      JOIN tags t ON at.tag_id = t.id 
      WHERE at.article_id = a.id AND t.name = ?
    )`;
    articlesParams.push(tag);
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);

  // 1. 分頁總數
  const filteredTotalQuery = `SELECT COUNT(*) as count FROM articles a ${articlesWhere}`;

  // 2. 取得文章與其包含的標籤 (使用 json_group_array 直接回傳 JSON 字串陣列)
  const articlesQuery = `
    SELECT a.id, a.slug, a.title, a.type, a.cover_image, a.excerpt, a.view_count, a.is_published, a.published_at,
           COALESCE((
             SELECT json_group_array(t.name)
             FROM article_tags at
             JOIN tags t ON at.tag_id = t.id
             WHERE at.article_id = a.id
           ), '[]') as tags
    FROM articles a
    ${articlesWhere}
    ORDER BY a.published_at DESC
    LIMIT ? OFFSET ?
  `;

  // 3. 分類統計聚合
  const categoryAggregationsQuery = `
    WITH AllTypes AS (
      SELECT DISTINCT type AS name FROM articles WHERE type IS NOT NULL
    ),
    FilteredTypes AS (
      SELECT type AS name, COUNT(id) AS count FROM articles a
      ${categoryWhere}
      GROUP BY type
    )
    SELECT AllTypes.name, COALESCE(FilteredTypes.count, 0) AS count
    FROM AllTypes
    LEFT JOIN FilteredTypes ON AllTypes.name = FilteredTypes.name
    ORDER BY count DESC, AllTypes.name ASC;
  `;

  // 4. 標籤統計聚合 (透過關聯表 JOIN)
  const tagsAggregationsQuery = `
    SELECT t.name, COUNT(at.article_id) AS count
    FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    JOIN articles a ON at.article_id = a.id
    ${tagsWhere}
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC;
  `;

  const [
    filteredTotalResult,
    articlesResult,
    categoryAggResult,
    tagsAggResult
  ] = await Promise.all([
    db.prepare(filteredTotalQuery).bind(...articlesParams).first(),
    db.prepare(articlesQuery).bind(...articlesParams, safeLimit, safeOffset).all(),
    db.prepare(categoryAggregationsQuery).bind(...categoryParams).all(),
    db.prepare(tagsAggregationsQuery).bind(...tagsParams).all()
  ]);

  const totalFiltered = (filteredTotalResult as any)?.count || 0;
  
  // 處理 tags 欄位，如果 SQLite 查無標籤會回傳 '[null]'，過濾掉該情況
  const articles = articlesResult.results.map(row => {
    let parsedTags: string[] = [];
    if (row.tags) {
        parsedTags = JSON.parse(row.tags as string);
        if (parsedTags.length === 1 && parsedTags[0] === null) parsedTags = [];
    }
    return { ...row, tags: parsedTags };
  });

  const totalCategories = categoryAggResult.results.reduce((sum, row) => sum + Number((row as any).count), 0);
  const totalTags = tagsAggResult.results.reduce((sum, row) => sum + Number((row as any).count), 0);

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
      totalCategories,
      totalTags,             
      categories: categoryAggResult.results,
      tags: tagsAggResult.results 
    }
  };
};

/**
 * 根據 slug 取得單篇文章詳細內容
 */
export const getArticleBySlugService = async (
  db: D1Database,
  slug: string,
  canViewDrafts = false
) => {
  const query = `
    SELECT a.*,
           COALESCE((
             SELECT json_group_array(t.name)
             FROM article_tags at
             JOIN tags t ON at.tag_id = t.id
             WHERE at.article_id = a.id
           ), '[]') as tags
    FROM articles a
    WHERE a.slug = ?${canViewDrafts ? '' : ' AND a.is_published = 1'}
  `;
  const result = await db.prepare(query).bind(slug).first();

  if (result) {
    let parsedTags = JSON.parse(result.tags as string);
    if (parsedTags.length === 1 && parsedTags[0] === null) parsedTags = [];
    result.tags = parsedTags;
  }
  
  return result;
};

/**
 * 共用函式：同步文章標籤
 */
const syncArticleTags = async (db: D1Database, articleId: number | string, tags: string[]) => {
  if (!tags || tags.length === 0) return;

  // 1. 確保標籤存在於 tags 表 (INSERT OR IGNORE)
  const insertTagsStmts = tags.map(tag => 
    db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(tag)
  );
  if (insertTagsStmts.length > 0) {
    await db.batch(insertTagsStmts);
  }

  // 2. 取得這些標籤的 IDs
  const placeholders = tags.map(() => '?').join(',');
  const { results: tagRows } = await db.prepare(`SELECT id FROM tags WHERE name IN (${placeholders})`).bind(...tags).all();

  // 3. 綁定關聯至 article_tags 表
  const insertArticleTagsStmts = tagRows.map(row => 
    db.prepare(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`).bind(articleId, row.id)
  );
  if (insertArticleTagsStmts.length > 0) {
    await db.batch(insertArticleTagsStmts);
  }
};

/**
 * 新增文章內容
 */
export const createArticleService = async (db: D1Database, payload: ArticlePayload) => {
  const query = `
    INSERT INTO articles (slug, title, type, cover_image, excerpt, content, github_url, demo_url, is_published, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *;
  `;
  
  const isPublished = payload.is_published ? 1 : 0;
  const publishedAt = isPublished ? new Date().toISOString() : null;

  // 1. 寫入文章
  const article = await db.prepare(query).bind(
    payload.slug, payload.title, payload.type, payload.cover_image || null,
    payload.excerpt || null, payload.content, 
    payload.github_url || null, payload.demo_url || null, 
    isPublished, publishedAt
  ).first();

  // 2. 寫入標籤並建立關聯
  if (article && payload.tags && payload.tags.length > 0) {
    await syncArticleTags(db, article.id as number, payload.tags);
  }

  // 將傳入的 tags 補回結果中方便前端顯示
  return { ...article, tags: payload.tags || [] };
};

/**
 * 更新文章內容
 */
export const updateArticleService = async (db: D1Database, id: string, payload: ArticlePayload) => {
  const query = `
    UPDATE articles 
    SET slug = ?, title = ?, type = ?, cover_image = ?, excerpt = ?, content = ?, 
        github_url = ?, demo_url = ?, is_published = ?,
        published_at = CASE 
            WHEN ? = 1 AND published_at IS NULL THEN CURRENT_TIMESTAMP
            WHEN ? = 0 THEN NULL
            ELSE published_at 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *;
  `;
  
  const isPublished = payload.is_published ? 1 : 0;

  // 1. 更新文章
  const article = await db.prepare(query).bind(
    payload.slug, payload.title, payload.type, payload.cover_image || null,
    payload.excerpt || null, payload.content, 
    payload.github_url || null, payload.demo_url || null, 
    isPublished, 
    isPublished, 
    isPublished, 
    id
  ).first();

  // 2. 更新標籤關聯
  if (article) {
    // 先清空該文章的所有舊標籤關聯
    await db.prepare(`DELETE FROM article_tags WHERE article_id = ?`).bind(id).run();
    // 重新建立標籤關聯
    if (payload.tags && payload.tags.length > 0) {
      await syncArticleTags(db, id, payload.tags);
    }
  }

  return { ...article, tags: payload.tags || [] };
};

/**
 * 移除文章
 */
export const deleteArticleService = async (db: D1Database, id: string) => {
  // 因 schema.sql 中 article_tags 表設定了 ON DELETE CASCADE，
  // 刪除 articles 資料會自動連帶清除對應的 article_tags，不需額外處理。
  const query = `
    DELETE FROM articles 
    WHERE id = ?
    RETURNING id;
  `;
  
  const result = await db.prepare(query).bind(id).first();
  return result;
};