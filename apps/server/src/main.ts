import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * 应用入口：
 *  - 全局前缀 /api/v1
 *  - CORS（允许携带凭证，支持跨域 SP 回调）
 *  - 全局校验管道（class-validator）
 *  - 全局异常过滤器（统一错误结构）
 *  - 限流守卫（@nestjs/throttler，在 AppModule 中以 APP_GUARD 注册）
 *  - Swagger 文档（/docs）
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: '.well-known/jwks.json', method: RequestMethod.GET },
      { path: '.well-known/openid-configuration', method: RequestMethod.GET },
      { path: 'oauth/authorize', method: RequestMethod.GET },
      { path: 'oauth/login', method: RequestMethod.GET },
      { path: 'oauth/login', method: RequestMethod.POST },
      { path: 'oauth/token', method: RequestMethod.POST },
      { path: 'oauth/userinfo', method: RequestMethod.GET },
      { path: 'oauth/introspect', method: RequestMethod.POST },
      { path: 'oauth/revoke', method: RequestMethod.POST },
      { path: 'oauth/endsession', method: RequestMethod.GET },
      { path: 'sp/(.*)', method: RequestMethod.ALL },
    ],
  });

  // CORS：允许跨域携带 Cookie / Authorization
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 全局 DTO 校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 统一异常响应
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 接口文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SSO 统一认证中心 API')
    .setDescription(
      '基于 NestJS 的单点登录（SSO）系统接口文档，符合 OAuth 2.0 / OpenID Connect 标准。\n\n' +
        '**OAuth 2.0 / OIDC 标准流程（所有 OAuth 端点均在根路径 `/oauth/*`，无 API 前缀）：**\n' +
        '1. SP 302 跳转 `GET /oauth/authorize?response_type=code&client_id=...&redirect_uri=...&scope=...`\n' +
        '2. 已登录 → 签发 Authorization Code 并 302 回调 SP；未登录 → 跳转登录页\n' +
        '3. SP 调用 `POST /oauth/token`（grant_type=authorization_code）换取 access_token + id_token + refresh_token\n' +
        '4. SP 调用 `GET /oauth/userinfo` 获取用户信息\n' +
        '5. SP 调用 `POST /oauth/introspect` 校验 Token 有效性\n' +
        '6. SP 调用 `GET /oauth/endsession` 发起单点登出',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('oauth', 'OAuth 2.0 / OIDC 标准接口')
    .addTag('oidc', 'OIDC Discovery & JWKS 端点')
    .addTag('auth', '认证与会话管理')
    .addTag('users', '用户管理接口')
    .addTag('apps', '业务系统（SP）管理接口')
    .addTag('jwks', '公钥集端点（.well-known）')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // 导出 OpenAPI spec 为 JSON，供 @hey-api/openapi-ts 生成类型安全 SDK
  const openapiOutputPath = path.resolve(__dirname, '../../../packages/shared/openapi.json');
  fs.mkdirSync(path.dirname(openapiOutputPath), { recursive: true });
  fs.writeFileSync(openapiOutputPath, JSON.stringify(document, null, 2));
  logger.log(`OpenAPI spec 已导出: ${openapiOutputPath}`);

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  logger.log(`SSO 认证中心已启动: http://localhost:${port}`);
  logger.log(`接口文档(Swagger): http://localhost:${port}/docs`);
  logger.log(`API 前缀: /${apiPrefix}`);
}

void bootstrap();
