import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { safeJsonParse } from '../../utils/safeJsonParse';

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
  galleryImages?: GalleryImagePayload[];
}

// 圖片集
export interface GalleryImagePayload {
  url: string;
  label?: string;
  sort_order?: number;
}

const getArticleGalleryImagesStmt = (db: D1Database, articleId: number | string) => {
  return db.prepare(`
    SELECT url, label, sort_order
    FROM article_images
    WHERE article_id = ?
    ORDER BY sort_order ASC, id ASC
  `).bind(articleId);
};

const getArticleGalleryImages = async (db: D1Database, articleId: number | string) => {
  const { results } = await getArticleGalleryImagesStmt(db, articleId).all();
  return results || [];
};

/**
 * 取得文章/作品列表與聚合統計（單一 db.batch 合併查詢，零快取延遲）
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
  // 1. 組裝基礎時間與發布狀態條件 (供分類統計共用)
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

  const categoryWhere = baseWhere;
  const categoryParams = [...baseParams];

  // 2. 組裝標籤統計條件 (套用 type 過濾)
  let tagsWhere = baseWhere;
  const tagsParams = [...baseParams];
  if (type) {
    tagsWhere += ` AND a.type = ?`;
    tagsParams.push(type);
  }

  // 3. 組裝文章列表與篩選總數條件 (套用 type + tag 過濾)
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

  // 4. 定義 4 條查詢語句（文章列表 + 篩選總數 + 分類統計 + 標籤統計）
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

  const filteredTotalQuery = `SELECT COUNT(*) as count FROM articles a ${articlesWhere}`;

  const categoryAggregationsQuery = `
    SELECT type AS name, COUNT(id) AS count FROM articles a
    ${categoryWhere}
    GROUP BY type
    ORDER BY count DESC, name ASC;
  `;

  const tagsAggregationsQuery = `
    SELECT t.name, COUNT(at.article_id) AS count
    FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    JOIN articles a ON at.article_id = a.id
    ${tagsWhere}
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC;
  `;

  // 🚀 關鍵：透過單一 db.batch() 一次拿回列表與所有統計數據
  const [articlesResult, totalRes, categoryAggResult, tagsAggResult] = await db.batch([
    db.prepare(articlesQuery).bind(...articlesParams, safeLimit, safeOffset),
    db.prepare(filteredTotalQuery).bind(...articlesParams),
    db.prepare(categoryAggregationsQuery).bind(...categoryParams),
    db.prepare(tagsAggregationsQuery).bind(...tagsParams)
  ]);

  // 5. 整理文章列表與解析標籤 JSON
  const articles = (articlesResult.results || []).map((row: any) => {
    let parsedTags = safeJsonParse<Array<string | null>>(row.tags, []);
    if (parsedTags.length === 1 && parsedTags[0] === null) {
      parsedTags = [];
    }
    return { ...row, tags: parsedTags as string[] };
  });

  // 6. 整理統計數據
  const totalFiltered = Number((totalRes.results?.[0] as any)?.count || 0);
  const categoryRows = (categoryAggResult.results || []) as { name: string; count: number }[];
  const tagRows = (tagsAggResult.results || []) as { name: string; count: number }[];

  const totalCategories = categoryRows.reduce((sum, row) => sum + Number(row.count), 0);
  const totalTags = tagRows.reduce((sum, row) => sum + Number(row.count), 0);

  return {
    data: articles,
    pagination: {
      totalFiltered,
      limit: safeLimit,
      offset: safeOffset,
      page: Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.ceil(totalFiltered / safeLimit) || 1
    },
    aggregations: {
      totalCategories,
      totalTags,
      categories: categoryRows,
      tags: tagRows
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
    // 1. 解析 Tags
    let parsedTags = safeJsonParse<Array<string | null>>(result.tags, []);
    if (parsedTags.length === 1 && parsedTags[0] === null) {
      parsedTags = [];
    }
    result.tags = parsedTags;

    // 2. 取得關聯的圖片集 (依據 sort_order 排序)
    result.galleryImages = await getArticleGalleryImages(db, result.id as number);
  }

  return result;
};

/**
 * 輔助函式：產生同步文章標籤所需的 Batch Statements
 */
const buildSyncArticleTagsStatements = (
  db: D1Database,
  articleId: number | string,
  tags?: string[],
  clearExisting = false
) => {
  const statements: D1PreparedStatement[] = [];

  if (clearExisting) {
    statements.push(
      db.prepare(`DELETE FROM article_tags WHERE article_id = ?`).bind(articleId)
    );
  }

  const normalizedTags = Array.isArray(tags)
    ? [...new Set(
        tags
          .map(tag => String(tag).trim())
          .filter(tag => tag.length > 0 && tag.length <= 50)
      )]
    : [];

  for (const tag of normalizedTags) {
    statements.push(
      db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(tag)
    );
    statements.push(
      db.prepare(`
        INSERT OR IGNORE INTO article_tags (article_id, tag_id)
        SELECT ?, id FROM tags WHERE name = ?
      `).bind(articleId, tag)
    );
  }

  return { statements, normalizedTags };
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

  // 1. 寫入文章主表並取得新建立的 article.id
  const article = await db
    .prepare(query)
    .bind(
      payload.slug,
      payload.title,
      payload.type,
      payload.cover_image || null,
      payload.excerpt || null,
      payload.content,
      payload.github_url || null,
      payload.demo_url || null,
      isPublished,
      publishedAt
    )
    .first();

  if (!article) {
    throw new Error('ARTICLE_CREATE_FAILED');
  }

  const articleId = Number(article.id);
  const batchStatements: D1PreparedStatement[] = [];

  // 2. 組裝標籤寫入與關聯語句
  const { statements: tagStmts, normalizedTags } = buildSyncArticleTagsStatements(
    db,
    articleId,
    payload.tags,
    false
  );
  batchStatements.push(...tagStmts);

  // 3. 組裝圖片集寫入語句
  const galleryImages = payload.galleryImages || [];
  galleryImages.forEach((img, index) => {
    const sortOrder = img.sort_order ?? index;
    const label = img.label || '';

    batchStatements.push(
      db.prepare(
        `INSERT INTO article_images (article_id, url, label, sort_order) VALUES (?, ?, ?, ?)`
      ).bind(articleId, img.url, label, sortOrder)
    );
  });

  // 4. 若有圖片，順便在同一個 batch 結尾查詢實際保存的圖片集
  if (galleryImages.length > 0) {
    batchStatements.push(getArticleGalleryImagesStmt(db, articleId));
  }

  let savedGalleryImages: Record<string, unknown>[] = [];
  if (batchStatements.length > 0) {
    const batchResults = await db.batch(batchStatements);
    if (galleryImages.length > 0) {
      savedGalleryImages = (batchResults[batchResults.length - 1].results as Record<string, unknown>[]) || [];
    }
  }

  return { ...article, tags: normalizedTags, galleryImages: savedGalleryImages };
};

/**
 * 更新文章內容 (單一 Batch 原子交易，具備自動 Rollback 保護)
 */
export const updateArticleService = async (db: D1Database, id: string, payload: ArticlePayload) => {
  // 1. 先確認文章是否存在，避免對不存在的 id 執行外鍵關聯寫入
  const existing = await db.prepare(`SELECT id FROM articles WHERE id = ?`).bind(id).first();
  if (!existing) {
    return null;
  }

  const isPublished = payload.is_published ? 1 : 0;
  const statements: D1PreparedStatement[] = [];

  // 2. 更新文章本體 (Batch 第 0 筆)
  statements.push(
    db.prepare(`
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
    `).bind(
      payload.slug,
      payload.title,
      payload.type,
      payload.cover_image || null,
      payload.excerpt || null,
      payload.content,
      payload.github_url || null,
      payload.demo_url || null,
      isPublished,
      isPublished,
      isPublished,
      id
    )
  );

  // 3. 組裝標籤同步語句 (包含清空舊關聯與建立新關聯)
  const { statements: tagStmts, normalizedTags } = buildSyncArticleTagsStatements(
    db,
    id,
    payload.tags,
    true
  );
  statements.push(...tagStmts);

  // 4. 組裝圖片集更新語句 (若有傳入 galleryImages 則先刪後增)
  if (payload.galleryImages !== undefined) {
    statements.push(
      db.prepare(`DELETE FROM article_images WHERE article_id = ?`).bind(id)
    );

    payload.galleryImages.forEach((img, index) => {
      const sortOrder = img.sort_order ?? index;
      const label = img.label || '';

      statements.push(
        db.prepare(
          `INSERT INTO article_images (article_id, url, label, sort_order) VALUES (?, ?, ?, ?)`
        ).bind(id, img.url, label, sortOrder)
      );
    });
  }

  // 5. 在 Batch 最後一筆查詢最新圖片集
  statements.push(getArticleGalleryImagesStmt(db, id));

  // 6. 一次性送出所有變更，確保 Transaction 原子性
  const batchResults = await db.batch(statements);

  const updatedArticle = (batchResults[0].results?.[0] as Record<string, unknown>) || null;
  if (!updatedArticle) {
    return null;
  }

  const savedGalleryImages = batchResults[batchResults.length - 1].results || [];

  return {
    ...updatedArticle,
    tags: normalizedTags,
    galleryImages: savedGalleryImages
  };
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

  const result = await db.prepare(query).bind(id).first();
  return result;
};