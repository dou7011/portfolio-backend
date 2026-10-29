import { Hono } from 'hono';
import type { AppEnv } from '../../types';
import { authGuard, optionalAuthGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import { getArticlesController,
  getArticleBySlugController,
  recordArticleViewController,
  createArticleController,
  updateArticleController,
  deleteArticleController
} from './articles.controller';

// 加上 AppEnv 泛型，確保與主程式型別一致
const articlesRoute = new Hono<AppEnv>();

// 公開使用者只能取得已發布文章；具 articles:write 權限者可依參數查詢發布狀態。
articlesRoute.get('/', optionalAuthGuard, getArticlesController);

// 公開使用者只能取得已發布文章；具 articles:write 權限者可取得草稿。
articlesRoute.get('/:slug', optionalAuthGuard, getArticleBySlugController);

// 公開端點：前端判定為有效閱讀（停留 3 分鐘或捲到底）後呼叫，瀏覽次數 +1。
articlesRoute.post('/:slug/view', recordArticleViewController);

// 新增文章內容，需先通過身份驗證與權限檢查。
articlesRoute.post(
  '/',
  authGuard,
  permissionGuard(PERMISSIONS.ARTICLE_WRITE),
  createArticleController
)

// 更新文章內容，需先通過身份驗證與權限檢查。
articlesRoute.put(
  '/:id',
  authGuard,
  permissionGuard(PERMISSIONS.ARTICLE_WRITE),
  updateArticleController
)

// 刪除文章，需先通過身份驗證與權限檢查。
articlesRoute.delete(
  '/:id',
  authGuard,
  permissionGuard(PERMISSIONS.ARTICLE_DELETE),
  deleteArticleController
)

export default articlesRoute;