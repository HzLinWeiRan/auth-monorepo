import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { createApp } from './create-app';

/** 启动 HTTP 服务并监听端口（仅在直接执行时调用）。 */
async function startServer(app: NestExpressApplication): Promise<void> {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const port = configService.get<number>('port') || 3000;

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`SSO 认证中心已启动: http://localhost:${port}`);
  logger.log(`接口文档(Swagger): http://localhost:${port}/docs`);
  logger.log(`API 前缀: /${apiPrefix}`);
}

/** 应用创建入口：创建并配置 app，但不监听端口。被 import（如 Vercel 函数）时复用此函数。 */
async function bootstrap() {
  const app = await createApp();
  startServer(app);
}

void bootstrap();
