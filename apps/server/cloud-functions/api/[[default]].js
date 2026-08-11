const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { AppModule } = require('../../../dist/app.module');

// 全局缓存 Nest 实例，避免每次请求重新 bootstrap
let cachedExpressApp;

async function bootstrap() {
  if (cachedExpressApp) return cachedExpressApp;

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const nestApp = await NestFactory.create(AppModule, adapter);
  
  // 如果你有全局前缀
  // nestApp.setGlobalPrefix('api');
  
  await nestApp.init();
  cachedExpressApp = expressApp;
  return expressApp;
}

// 必须导出框架实例，否则构建器不会将其识别为函数
module.exports = bootstrap();