import type { D1Database } from '@cloudflare/workers-types';
import type { Context } from 'hono';

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

export interface AggregationMetaData {
  totalFiltered: number;
  aggregations: {
    totalCategories: number;
    totalTags: number;
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
  };
}

const META_CACHE_VERSION_URL = new Request(
  'https://portfolio-backend.internal/cache/meta-version'
);
const META_CACHE_TTL_SECONDS = 900;

const getMetaCache = () => (caches as any).default as Cache;

const getMetaCacheVersion = async (c: Context | undefined) => {
  const cache = getMetaCache();
  const cachedVersion = await cache.match(META_CACHE_VERSION_URL);
  if (cachedVersion) return cachedVersion.text();

  const version = crypto.randomUUID();
  const versionResponse = new Response(version, {
    headers: { 'Cache-Control': `s-maxage=${META_CACHE_TTL_SECONDS}` }
  });

  if (c?.executionCtx) {
    c.executionCtx.waitUntil(cache.put(META_CACHE_VERSION_URL, versionResponse));
  } else {
    await cache.put(META_CACHE_VERSION_URL, versionResponse);
  }

  return version;
};

export const invalidateArticleMetadataCache = async () => {
  await getMetaCache().delete(META_CACHE_VERSION_URL);
};

/**
 * 取得文章的聚合統計與總數 (具備 Edge 快取能力)
 */
const getCachedAggregations = async (
  db: D1Database,
  c: Context | undefined,
  filters: {
    type?: string;
    tag?: string;
    isPublished?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<AggregationMetaData> => {
  const { type, tag, isPublished, startTime, endTime } = filters;

  // 1. 建立專屬的 Cache Key (URL)
  const cacheVersion = await getMetaCacheVersion(c);
  const cacheUrl = new URL('https://portfolio-backend.internal/cache/meta');
  cacheUrl.searchParams.set('version', cacheVersion);
  if (type) cacheUrl.searchParams.set('type', type);
  if (tag) cacheUrl.searchParams.set('tag', tag);
  if (isPublished !== undefined) cacheUrl.searchParams.set('isPublished', isPublished.toString());
  if (startTime) cacheUrl.searchParams.set('startTime', startTime);
  if (endTime) cacheUrl.searchParams.set('endTime', endTime);

  const cacheRequest = new Request(cacheUrl.toString());
  const cache = getMetaCache();

  // 2. 嘗試從 Edge 節點讀取快取
  const cachedRes = await cache.match(cacheRequest);
  if (cachedRes) {
    return await cachedRes.json() as AggregationMetaData;
  }

  // 3. 快取未命中：重新組裝統計專用的 WHERE 條件
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

  let tagsWhere = baseWhere;
  const tagsParams = [...baseParams];
  if (type) {
    tagsWhere += ` AND a.type = ?`;
    tagsParams.push(type);
  }

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

  // 4. 執行昂貴的資料庫統計查詢
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

  const [totalRes, categoryAggResult, tagsAggResult] = await Promise.all([
    db.prepare(filteredTotalQuery).bind(...articlesParams).first(),
    db.prepare(categoryAggregationsQuery).bind(...categoryParams).all(),
    db.prepare(tagsAggregationsQuery).bind(...tagsParams).all()
  ]);

  const totalFiltered = (totalRes as any)?.count || 0;
  const totalCategories = categoryAggResult.results.reduce((sum, row) => sum + Number((row as any).count), 0);
  const totalTags = tagsAggResult.results.reduce((sum, row) => sum + Number((row as any).count), 0);

  const metaData: AggregationMetaData = { 
    totalFiltered,
    aggregations: {
      totalCategories,
      totalTags,
      categories: categoryAggResult.results as { name: string; count: number }[],
      tags: tagsAggResult.results as { name: string; count: number }[]
    }
  };

  // 5. 將結果寫入快取 (設定 300 秒 TTL)，並推到背景執行
  const responseToCache = new Response(JSON.stringify(metaData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `s-maxage=${META_CACHE_TTL_SECONDS}`
    }
  });
  
  if (c?.executionCtx) {
    c.executionCtx.waitUntil(cache.put(cacheRequest, responseToCache));
  } else {
    await cache.put(cacheRequest, responseToCache);
  }

  return metaData;
};

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
  endTime?: string,
  c?: Context
) => {
  // 1. 組裝「文章列表」專用的條件
  let articlesWhere = `WHERE 1=1`;
  const articlesParams: (string | number)[] = [];
  
  if (isPublished !== undefined) {
    articlesWhere += ` AND a.is_published = ?`;
    articlesParams.push(isPublished);
  }

  if (startTime) {
    articlesWhere += ` AND a.published_at >= ?`;
    articlesParams.push(startTime);
  }
  if (endTime) {
    articlesWhere += ` AND a.published_at <= ?`;
    articlesParams.push(endTime);
  }
  if (type) {
    articlesWhere += ` AND a.type = ?`;
    articlesParams.push(type);
  }
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

  // 2. 查詢最新文章列表 (不快取，永遠保持即時)
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
  
  const articlesResult = await db.prepare(articlesQuery).bind(...articlesParams, safeLimit, safeOffset).all();
  const articles = articlesResult.results.map(row => {
    let parsedTags: string[] = [];
    if (row.tags) {
        parsedTags = JSON.parse(row.tags as string);
        if (parsedTags.length === 1 && parsedTags[0] === null) parsedTags = [];
    }
    return { ...row, tags: parsedTags };
  });

  // 3. 呼叫獨立的聚合快取函式
  const metaData = await getCachedAggregations(db, c, {
    type, tag, isPublished, startTime, endTime
  });

  // 4. 組合最終結果
  return {
    data: articles,
    pagination: {
      totalFiltered: metaData.totalFiltered,   
      limit: safeLimit,
      offset: safeOffset,
      page: Math.floor(safeOffset / safeLimit) + 1,
      totalPages: Math.ceil(metaData.totalFiltered / safeLimit) || 1
    },
    aggregations: metaData.aggregations
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

  const normalizedTags = [...new Set(tags
    .map(tag => String(tag).trim())
    .filter(tag => tag.length > 0 && tag.length <= 50)
  )];

  if (normalizedTags.length === 0) return;

  // 1. 確保標籤存在於 tags 表 (INSERT OR IGNORE)
  const insertTagsStmts = normalizedTags.map(tag => 
    db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(tag)
  );
  if (insertTagsStmts.length > 0) {
    await db.batch(insertTagsStmts);
  }

  // 2. 取得這些標籤的 IDs
  const placeholders = normalizedTags.map(() => '?').join(',');
  const { results: tagRows } = await db.prepare(`SELECT id FROM tags WHERE name IN (${placeholders})`).bind(...normalizedTags).all();

  // 3. 綁定關聯至 article_tags 表，避免重複關聯造成 UNIQUE constraint
  const uniqueTagIds = [...new Set(tagRows.map(row => Number(row.id)))];
  const insertArticleTagsStmts = uniqueTagIds.map(tagId => 
    db.prepare(`INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)`).bind(articleId, tagId)
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
  const normalizedTags = Array.isArray(payload.tags)
    ? [...new Set(payload.tags.map(tag => String(tag).trim()).filter(Boolean))]
    : [];

  if (article && normalizedTags.length > 0) {
    await syncArticleTags(db, Number(article.id), normalizedTags);
  }

  // 將傳入的 tags 補回結果中方便前端顯示
  return { ...article, tags: normalizedTags };
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
  const normalizedTags = Array.isArray(payload.tags)
    ? [...new Set(payload.tags.map(tag => String(tag).trim()).filter(Boolean))]
    : [];

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

  if (!article) {
    return null;
  }

  // 2. 更新標籤關聯
  await db.prepare(`DELETE FROM article_tags WHERE article_id = ?`).bind(id).run();
  if (normalizedTags.length > 0) {
    await syncArticleTags(db, Number(article.id), normalizedTags);
  }

  return { ...article, tags: normalizedTags };
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