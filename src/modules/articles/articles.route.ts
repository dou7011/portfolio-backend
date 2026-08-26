import { Hono } from 'hono';
import type { AppEnv } from '../../types';
import { authGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import { getPublishedArticlesController,
  getArticleBySlugController,
  createArticleController,
  updateArticleController,
  deleteArticleController
} from './articles.controller';

// 加上 AppEnv 泛型，確保與主程式型別一致
const articlesRoute = new Hono<AppEnv>();

// 取得已發布的文章列表，為公開端點。
articlesRoute.get('/', getPublishedArticlesController);
// 透過 slug 取得單篇文章詳細內容，為公開端點。
articlesRoute.get('/:slug', getArticleBySlugController);


// 新增文章內容，需先通過身份驗證與權限檢查。
articlesRoute.post(
  '/',
  authGuard,
  permissionGuard(PERMISSIONS.ARTICLE_WRITE),
  createArticleController
)

// 更新文章內容，需先通過身份驗證與權限檢查。
articlesRoute.put(
  '/:slug',
  authGuard,
  permissionGuard(PERMISSIONS.ARTICLE_WRITE),
  updateArticleController
)

// 刪除文章，需先通過身份驗證與權限檢查。
articlesRoute.delete(
  '/:slug',
  authGuard,
  permissionGuard(PERMISSIONS.ARTICLE_DELETE),
  deleteArticleController
)

export default articlesRoute;