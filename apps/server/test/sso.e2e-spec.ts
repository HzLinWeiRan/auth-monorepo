import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * SSO 核心链路 e2e 测试：
 * 注册 → 登录签发双 Token → /validate 校验 → /refresh 刷新 → 应用管理 CRUD → /logout 单点登出失效会话
 * 浏览器端的 /sso/authorize + Ticket 一次一用流程已在手动端到端验证中覆盖。
 */
describe('SSO 核心链路 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  const username = `e2e_${Date.now()}`;
  const password = 'Str0ng@Pass';
  let appId: string;

  beforeAll(async () => {
    process.env.DB_DATABASE = './sso-test.sqlite';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('健康检查', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toBeDefined();
  });

  it('注册账号', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users/register')
      .send({ username, password })
      .expect(201);
    expect(res.body.data.username).toBe(username);
  });

  it('登录签发双 Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password })
      .expect(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('错误的密码登录被拒绝', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password: 'wrong' })
      .expect(401);
  });

  it('校验 Token 有效', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/validate')
      .send({ token: accessToken })
      .expect(200);
    expect(res.body.data.valid).toBe(true);
  });

  it('刷新 Token 成功', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('未登录创建应用被拒绝 (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/apps')
      .send({ name: 'x', redirectUri: 'http://localhost/cb' })
      .expect(401);
  });

  it('创建应用并返回 secret', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/apps')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: '测试应用',
        redirectUri: 'http://localhost:9000/callback',
        logoutCallbackUrl: 'http://localhost:9000/slo',
      })
      .expect(201);
    expect(res.body.data.appId).toBeDefined();
    expect(res.body.data.secret).toBeDefined();
    appId = res.body.data.appId;
  });

  it('应用列表不含 secret', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/apps')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.find((a: any) => a.appId === appId).secret).toBeUndefined();
  });

  it('应用详情不含 secret', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/apps/${appId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data.appId).toBe(appId);
    expect(res.body.data.secret).toBeUndefined();
  });

  it('单点登出后 Token 失效', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/validate')
      .send({ token: accessToken })
      .expect(200);
    expect(res.body.data.valid).toBe(false);
  });

  it('删除应用', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/apps/${appId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/apps/${appId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
