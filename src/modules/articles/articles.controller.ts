// 文章模組的控制器，負責處理文章相關的 HTTP 請求，並呼叫對應的服務層邏輯。
import { Context } from 'hono';
import type { AppEnv } from '../../types';
import { logger } from '../../utils/logger';
import { fail, ok } from '../../utils/response';
import { getPublishedArticlesService,
getArticleBySlugService,
createArticleService,
updateArticleService,
deleteArticleService,
type ArticlePayload
} from './articles.service';

/**
 * 取得已發布的文章/作品列表
 */
export const getPublishedArticlesController = async (c: Context<AppEnv>) => {
  try {
    const type = c.req.query('type');
    const db = c.env.DB;
    const articles = await getPublishedArticlesService(db, type);
    
    return ok(c, { data: articles });
  } catch (error: any) {
    // 統一使用 logger 紀錄錯誤
    logger.error('getPublishedArticlesController', error);
    // 使用 fail() 封裝錯誤回應與 HTTP 狀態碼
    return fail(c, 500, 'INTERNAL_ERROR', '伺服器錯誤，無法取得資料');
  }
};

/**
 * 透過 slug 取得單篇文章詳細內容
 */
export const getArticleBySlugController = async (c: Context<AppEnv>) => {
  try {
    const slug = c.req.param('slug');
    // 確保 slug 一定存在
    if (!slug) {
      return fail(c, 400, 'BAD_REQUEST', '缺少必要的文章識別碼 (slug)');
    }
    const db = c.env.DB;

    const article = await getArticleBySlugService(db, slug);
    
    if (!article) {
      return fail(c, 404, 'NOT_FOUND', '找不到該文章或專案');
    }

    return ok(c, { data: article });
  } catch (error: any) {
    logger.error('getArticleBySlugController', error);
    return fail(c, 500, 'INTERNAL_ERROR', '伺服器錯誤，無法取得資料');
  }
};

/**
 * 新增文章 (需權限)
 */
export const createArticleController = async (c: Context<AppEnv>) => {
  try {
    const body = await c.req.json<ArticlePayload>();
    
    // 基本的防禦性驗證
    if (!body.slug || !body.title || !body.content) {
      return fail(c, 400, 'BAD_REQUEST', '缺少必填欄位 (slug, title, content)');
    }

    const db = c.env.DB;
    const newArticle = await createArticleService(db, body);
    
    return ok(c, { message: '文章建立成功', data: newArticle });
  } catch (error: any) {
    logger.error('createArticleController', error);
    // 捕捉 slug 重複的錯誤 (SQLite 的 UNIQUE constraint failed)
    if (error.message.includes('UNIQUE constraint failed')) {
      return fail(c, 409, 'CONFLICT', '這個 slug 已經被使用過了，請換一個');
    }
    return fail(c, 500, 'INTERNAL_ERROR', '建立文章失敗');
  }
};

/**
 * 更新文章 (需權限)
 */
export const updateArticleController = async (c: Context<AppEnv>) => {
  try {
    const id = c.req.param('id');
    if (!id) return fail(c, 400, 'BAD_REQUEST', '缺少文章 ID');

    const body = await c.req.json<ArticlePayload>();
    const db = c.env.DB;
    
    const updatedArticle = await updateArticleService(db, id, body);
    
    if (!updatedArticle) {
      return fail(c, 404, 'NOT_FOUND', '找不到該文章');
    }

    return ok(c, { message: '文章更新成功', data: updatedArticle });
  } catch (error: any) {
    logger.error('updateArticleController', error);
    return fail(c, 500, 'INTERNAL_ERROR', '更新文章失敗');
  }
};

/**
 * 刪除文章 (需權限)
 */
export const deleteArticleController = async (c: Context<AppEnv>) => {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return fail(c, 400, 'BAD_REQUEST', '缺少要刪除的文章 ID');
    }

    const db = c.env.DB;
    const deletedRecord = await deleteArticleService(db, id);
    
    // 如果資料庫沒有回傳 id，代表原本就找不到這筆資料
    if (!deletedRecord) {
      return fail(c, 404, 'NOT_FOUND', '找不到該文章，可能已被刪除');
    }

    return ok(c, { message: '文章已成功刪除' });
  } catch (error: any) {
    logger.error('deleteArticleController', error);
    return fail(c, 500, 'INTERNAL_ERROR', '刪除文章失敗');
  }
};