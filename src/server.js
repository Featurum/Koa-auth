import fs from 'fs';
import Koa from 'koa';
import http from 'http'
import env from 'dotenv';
import cors from '@koa/cors';

/* Конфигурация */
env.config();

/* Инициализация сервера */
const app = new Koa();

/* Роутинг */
import router from './router';

app.use(cors())
   .use(router.routes())
   .use(router.allowedMethods())
   .listen(process.env.PORT);
