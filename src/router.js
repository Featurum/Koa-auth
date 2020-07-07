import Router from 'koa-router';
import KoaBody from 'koa-body';

const router = new Router();

import { task, check, refresh, signout, test } from './processing';
import './crear.js';

/* Заявка на регистрацию/авторизацию */
router.post('/task', KoaBody(), async (ctx, next) => {
	ctx.body = await task(ctx.request.body)
});

/* Проверка кода восстановления */
router.post('/check', KoaBody(), async (ctx, next) => {
	ctx.body = await check(ctx.request.body)
});

/* Обновление токенов */
router.post('/refresh', KoaBody(), async (ctx, next) => {
	ctx.body = await refresh(ctx.request.body)
});

/* Выход */
router.post('/signout', KoaBody(), async (ctx, next) => {
	ctx.body = await signout(ctx.request.body)
});

/* Заглушка */
router.get('*', async (ctx, next) => {
	ctx.body = 'Сервис аутентификации'
});

export default router