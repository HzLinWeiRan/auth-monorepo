import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  OnModuleInit,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { AppService } from '../app/app.service';
import { App } from '../app/app.entity';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { parseCookies } from '../../common/utils/cookie.util';
import { PublicUser } from '../auth/auth.service';

/** SP 本地会话 Cookie 名称 */
const SP_TOKEN_COOKIE = 'sp_token';
/** 存储 PKCE code_verifier 的 Cookie（供回调时恢复） */
const PKCE_COOKIE = 'sp_pkce';
/** 存储 id_token 的 Cookie（供登出时使用） */
const ID_TOKEN_COOKIE = 'sp_id_token';
/** 演示账号 */
const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';
/** 演示应用标识 */
const DEMO_APP_ID = 'demo-sp';

/**
 * 内置演示业务系统（SP），使用 OAuth 2.0 Authorization Code Flow + PKCE。
 */
@ApiTags('sp-demo')
@Controller('sp')
export class DemoSpController implements OnModuleInit {
  constructor(
    private readonly auth: AuthService,
    private readonly apps: AppService,
    private readonly users: UserService,
    private readonly config: ConfigService,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
  ) {}

  /** 模块初始化时自动注册演示应用与演示账号 */
  async onModuleInit(): Promise<void> {
    const port = this.config.get<number>('port') || 3000;
    const base = `http://localhost:${port}`;
    await this.apps.ensureApp({
      appId: DEMO_APP_ID,
      name: '演示业务系统',
      redirectUri: `${base}/sp/callback`,
      logoutCallbackUrl: `${base}/sp/slo`,
      redirectUris: JSON.stringify([`${base}/sp/callback`]),
      postLogoutRedirectUris: JSON.stringify([`${base}/sp`]),
      grantTypes: JSON.stringify(['authorization_code', 'refresh_token']),
      scopes: JSON.stringify(['openid', 'profile', 'email']),
    });
    await this.ensureDemoUser();
  }

  private async ensureDemoUser(): Promise<void> {
    try {
      await this.users.register({
        username: DEMO_USERNAME,
        password: DEMO_PASSWORD,
      });
    } catch {
      // 忽略已存在
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'SP 受保护资源首页（无会话则跳转 IdP 登录）' })
  @ApiResponse({ status: 200, description: '已登录，返回受保护资源 HTML' })
  @ApiResponse({ status: 302, description: '无会话或会话失效，302 跳转至 /oauth/authorize' })
  async home(@Req() req: Request, @Res() res: Response) {
    const token = parseCookies(req)[SP_TOKEN_COOKIE];

    if (!token) {
      return this.redirectToAuthorize(req, res);
    }

    const result = await this.auth.validateToken({ token });
    if (!result.valid || !result.user) {
      res.clearCookie(SP_TOKEN_COOKIE);
      res.clearCookie(ID_TOKEN_COOKIE);
      return this.redirectToAuthorize(req, res);
    }

    return res.send(this.renderHome(result.user, token));
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'SP 回调：用 Authorization Code 换取 Token 并建立本地会话' })
  @ApiQuery({ name: 'code', required: false, description: 'OAuth 2.0 Authorization Code', example: 'a1b2c3d4...' })
  @ApiQuery({ name: 'state', required: false, description: '防 CSRF 状态值', example: 'xyz123' })
  @ApiResponse({ status: 302, description: '换票后 302 跳转至 SP 首页' })
  async callback(
    @Query('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookies = parseCookies(req);
    const codeVerifier = cookies[PKCE_COOKIE];
    const secret = await this.getDemoAppSecret();

    if (code) {
      try {
        const port = this.config.get<number>('port') || 3000;
        const response = await fetch(
          `http://localhost:${port}/oauth/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              code,
              redirect_uri: `${req.protocol}://${req.get('host')}/sp/callback`,
              client_id: DEMO_APP_ID,
              client_secret: secret,
              code_verifier: codeVerifier || undefined,
            }),
          },
        );

        const data = await response.json() as Record<string, unknown>;
        if (data.access_token) {
          res.cookie(SP_TOKEN_COOKIE, data.access_token, {
            httpOnly: true,
            sameSite: 'lax' as const,
            maxAge: 900000,
          });
          if (data.id_token) {
            res.cookie(ID_TOKEN_COOKIE, data.id_token, {
              httpOnly: true,
              sameSite: 'lax' as const,
              maxAge: 3600000,
            });
          }
        }
      } catch {
        // 换票失败，忽略
      }
    }

    res.clearCookie(PKCE_COOKIE);
    return res.redirect(`${req.protocol}://${req.get('host')}/sp`);
  }

  @Public()
  @Get('logout')
  @ApiOperation({ summary: 'SP 发起 OIDC RP-Initiated Logout' })
  @ApiResponse({ status: 302, description: '302 跳转至 /oauth/endsession' })
  async logout(@Req() req: Request, @Res() res: Response) {
    const cookies = parseCookies(req);
    const idToken = cookies[ID_TOKEN_COOKIE];

    res.clearCookie(SP_TOKEN_COOKIE);
    res.clearCookie(ID_TOKEN_COOKIE);

    if (idToken) {
      const postLogoutUri = `${req.protocol}://${req.get('host')}/sp`;
      return res.redirect(
        `/oauth/endsession?id_token_hint=${encodeURIComponent(idToken)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri)}`,
      );
    }

    // 无 id_token 时直接回首页，SP 本地 Cookie 已清除
    return res.redirect(`${req.protocol}://${req.get('host')}/sp`);
  }

  @Public()
  @Post('slo')
  @Get('slo')
  @ApiOperation({ summary: 'SLO 广播接收端：清除本地会话' })
  @ApiResponse({ status: 200, description: '已清除本地会话' })
  async slo(@Res() res: Response) {
    res.clearCookie(SP_TOKEN_COOKIE);
    res.clearCookie(ID_TOKEN_COOKIE);
    return res.status(200).json({ ok: true });
  }

  /** 302 跳转到 /oauth/authorize，同时设置 PKCE code_verifier Cookie */
  private redirectToAuthorize(req: Request, res: Response): void {
    const callback = `${req.protocol}://${req.get('host')}/sp/callback`;
    const state = randomBytes(16).toString('hex');
    const nonce = randomBytes(16).toString('hex');

    // PKCE: code_verifier → SHA-256 → Base64URL → code_challenge
    const codeVerifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = challenge
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 将 code_verifier 写入 Cookie（回调时恢复）
    res.cookie(PKCE_COOKIE, codeVerifier, {
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 120000, // 2 分钟
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: DEMO_APP_ID,
      redirect_uri: callback,
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce,
    });

    return res.redirect(`/oauth/authorize?${params.toString()}`);
  }

  /** 从 DB 中获取演示应用的 client_secret */
  private async getDemoAppSecret(): Promise<string> {
    const app = await this.appRepo.findOne({ where: { appId: DEMO_APP_ID } });
    return app?.secret || '';
  }

  /** 渲染 SP 受保护资源主页 */
  private renderHome(user: PublicUser, token: string): string {
    const shortToken = token.length > 36 ? `${token.slice(0, 18)}…${token.slice(-10)}` : token;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>演示业务系统 (OAuth 2.0)</title>
  <style>
    @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
    * { font-family: "PingFang SC", system-ui, sans-serif; }
    body { margin:0; min-height:100vh; background:linear-gradient(135deg,#F1F5F9,#DBEAFE); display:flex; align-items:center; justify-content:center; }
    .glass { background:rgba(255,255,255,.72); backdrop-filter:blur(18px); border:1px solid rgba(255,255,255,.6); box-shadow:0 20px 50px -12px rgba(37,99,235,.25); border-radius:24px; }
    .btn { background:linear-gradient(135deg,#2563EB,#1D4ED8); transition:transform .18s ease, box-shadow .18s ease; box-shadow:0 10px 22px -8px rgba(37,99,235,.55); }
    .btn:hover { transform:translateY(-2px); }
    .tag { background:rgba(22,163,74,.12); color:#16A34A; }
    .badge { background:rgba(37,99,235,.1); color:#2563EB; font-size:11px; font-weight:600; padding:2px 8px; border-radius:6px; }
  </style>
</head>
<body>
  <main class="glass w-[480px] px-9 py-10 text-[#0F172A]">
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-[12px] text-[#64748B]">演示业务系统 · SP</p>
        <h1 class="text-[22px] font-semibold mt-1">受保护资源页</h1>
      </div>
      <div class="flex items-center gap-2">
        <span class="badge">OAuth 2.0</span>
        <span class="tag text-[12px] font-medium px-3 py-1 rounded-full">已登录</span>
      </div>
    </div>

    <div class="rounded-2xl bg-white/60 border border-slate-100 px-5 py-4 mb-5">
      <p class="text-[13px] text-[#64748B]">当前用户</p>
      <p class="text-[18px] font-semibold mt-0.5">${user.username}</p>
      ${user.email ? `<p class="text-[12px] text-[#94A3B8] mt-1">${user.email}</p>` : ''}
    </div>

    <div class="rounded-2xl bg-white/60 border border-slate-100 px-5 py-4 mb-6">
      <p class="text-[13px] text-[#64748B]">Access Token（OAuth 2.0 Bearer Token）</p>
      <p class="text-[12px] font-mono mt-1 break-all text-[#475569]">${shortToken}</p>
    </div>

    <p class="text-[12px] text-[#94A3B8] mb-4 leading-relaxed">
      你已通过 <b>OAuth 2.0 Authorization Code Flow + PKCE</b> 完成单点登录。
      点击登出将触发 <b>OIDC RP-Initiated Logout</b>，清除 IdP 全局会话并广播通知所有业务系统。
    </p>

    <a href="/sp/logout"
      class="btn block text-center w-full rounded-xl py-3 text-[15px] font-medium text-white">
      单点登出（SLO）
    </a>
  </main>
</body>
</html>`;
  }
}