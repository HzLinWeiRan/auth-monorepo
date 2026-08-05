import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Req,
  UnauthorizedException,
  NotFoundException,
  UseFilters,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { App } from '../app/app.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { parseCookies, SESSION_COOKIE } from '../../common/utils/cookie.util';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AuthorizationRequestDto } from './dto/oauth/authorization-request.dto';
import { SsoLoginDto } from './dto/sso-login.dto';
import { OAuthExceptionFilter } from './oauth-exception.filter';

/**
 * OAuth 2.0 / OIDC 浏览器端点（根路径，不挂 /api/v1 前缀）：
 *  - GET  /oauth/authorize   OAuth 2.0 授权端点（Authorization Code Flow）
 *  - GET  /oauth/login       渲染登录页
 *  - POST /oauth/login       处理登录表单，写 Cookie 后回跳 /oauth/authorize
 *  - GET  /oauth/endsession  OIDC RP-Initiated Logout
 */
@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  private readonly loginHtml: string;

  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
  ) {
    const file = path.join(__dirname, '..', '..', 'modules', 'demo-sp', 'views', 'login.html');
    this.loginHtml = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '<form method="post" action="/oauth/login"></form>';
  }

  @Public()
  @Get('authorize')
  @UseFilters(OAuthExceptionFilter)
  @ApiOperation({ summary: 'OAuth 2.0 授权端点（Authorization Code Flow）' })
  @ApiQuery({ name: 'response_type', required: true, description: '授权类型，固定为 "code"', example: 'code' })
  @ApiQuery({ name: 'client_id', required: true, description: 'OAuth 客户端标识', example: 'demo-sp' })
  @ApiQuery({ name: 'redirect_uri', required: true, description: '授权成功后的回调地址', example: 'http://localhost:3000/sp/callback' })
  @ApiQuery({ name: 'scope', required: false, description: '请求的作用域（空格分隔），如 "openid profile email"', example: 'openid profile email' })
  @ApiQuery({ name: 'state', required: false, description: '透传给 SP 的 opaque 状态值，用于防 CSRF', example: 'xyz123' })
  @ApiQuery({ name: 'code_challenge', required: false, description: 'PKCE code_challenge' })
  @ApiQuery({ name: 'code_challenge_method', required: false, description: 'PKCE 变换方法：S256 或 plain', example: 'S256' })
  @ApiQuery({ name: 'nonce', required: false, description: 'OIDC nonce', example: 'n-0S6_WzA2Mj' })
  @ApiResponse({ status: 302, description: '302 跳转：已登录回调 SP（携带 code），未登录跳登录页' })
  @ApiResponse({ status: 404, description: '未知应用' })
  @ApiResponse({ status: 401, description: '回调地址不匹配' })
  async authorize(
    @Query() q: AuthorizationRequestDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, nonce } = q;

    // 校验应用存在性
    if (client_id) {
      const app = await this.appRepo.findOne({ where: { appId: client_id } });
      if (!app) {
        throw new NotFoundException('未知应用');
      }
    }

    // 检测全局会话
    const cookieSessionId = parseCookies(req)[SESSION_COOKIE];
    const session = cookieSessionId
      ? await this.sessions.findValid(cookieSessionId)
      : null;

    if (!session) {
      // 未登录：跳转登录页，透传全部 OAuth 参数
      const loginQuery = new URLSearchParams();
      loginQuery.set('response_type', q.response_type || 'code');
      if (client_id) loginQuery.set('client_id', client_id);
      if (redirect_uri) loginQuery.set('redirect_uri', redirect_uri);
      if (scope) loginQuery.set('scope', scope);
      if (state) loginQuery.set('state', state);
      if (code_challenge) loginQuery.set('code_challenge', code_challenge);
      if (code_challenge_method) loginQuery.set('code_challenge_method', code_challenge_method);
      if (nonce) loginQuery.set('nonce', nonce);
      return res.redirect(`/oauth/login?${loginQuery.toString()}`);
    }

    // 已登录：签发 authorization code
    try {
      const { code } = await this.auth.authorize({
        clientId: client_id,
        redirectUri: redirect_uri,
        scope,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        nonce,
        userId: session.userId,
      });

      const url = new URL(redirect_uri);
      url.searchParams.set('code', code);
      if (state) url.searchParams.set('state', state);
      return res.redirect(url.toString());
    } catch (err) {
      const loginQuery = new URLSearchParams();
      if (client_id) loginQuery.set('client_id', client_id);
      if (redirect_uri) loginQuery.set('redirect_uri', redirect_uri);
      if (scope) loginQuery.set('scope', scope);
      if (state) loginQuery.set('state', state);
      loginQuery.set('error', (err as Error).message || '授权失败');
      return res.redirect(`/oauth/login?${loginQuery.toString()}`);
    }
  }

  @Public()
  @Get('login')
  @ApiOperation({ summary: '渲染 OAuth 登录页' })
  @ApiQuery({ name: 'client_id', required: false, description: 'OAuth 客户端标识', example: 'demo-sp' })
  @ApiQuery({ name: 'redirect_uri', required: false, description: '回调地址', example: 'http://localhost:3000/sp/callback' })
  @ApiQuery({ name: 'scope', required: false, description: '请求的作用域', example: 'openid profile email' })
  @ApiQuery({ name: 'state', required: false, description: '透传状态值', example: 'xyz123' })
  @ApiQuery({ name: 'code_challenge', required: false, description: 'PKCE code_challenge' })
  @ApiQuery({ name: 'code_challenge_method', required: false, description: 'PKCE 方法' })
  @ApiQuery({ name: 'nonce', required: false, description: 'OIDC nonce' })
  @ApiQuery({ name: 'error', required: false, description: '上次登录失败时的错误提示信息', example: '用户名或密码错误' })
  @ApiResponse({ status: 200, description: '返回登录页 HTML' })
  async loginPage(
    @Query('response_type') responseType: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Query('nonce') nonce: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    // 根据 client_id 查找应用品牌配置
    let appName = '统一身份认证平台';
    let primaryColor = '#2563EB';
    let primaryColorDark = '#1D4ED8';
    let logoContent = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"></path>
          <path d="M9 12l2 2 4-4"></path>
        </svg>`;

    if (clientId) {
      try {
        const app = await this.appRepo.findOne({ where: { appId: clientId } });
        if (app) {
          appName = app.name;
          if (app.primaryColor) {
            primaryColor = app.primaryColor;
            primaryColorDark = this.darkenColor(app.primaryColor, 0.15);
          }
          if (app.logoUrl) {
            logoContent = `<img src="${app.logoUrl}" alt="${appName}" />`;
          }
        }
      } catch {
        // 查不到就用默认
      }
    }

    const html = this.loginHtml
      .replace('{{PAGE_TITLE}}', appName)
      .replace('{{PRIMARY_COLOR}}', primaryColor)
      .replace('{{PRIMARY_COLOR_DARK}}', primaryColorDark)
      .replace('{{APP_NAME}}', appName)
      .replace('{{LOGO_CONTENT}}', logoContent)
      .replace('{{RESPONSE_TYPE}}', responseType || 'code')
      .replace('{{APP_ID}}', clientId || '')
      .replace('{{REDIRECT_URI}}', redirectUri || '')
      .replace('{{SCOPE}}', scope || '')
      .replace('{{STATE}}', state || '')
      .replace('{{CODE_CHALLENGE}}', codeChallenge || '')
      .replace('{{CODE_CHALLENGE_METHOD}}', codeChallengeMethod || '')
      .replace('{{NONCE}}', nonce || '')
      .replace('{{ERROR}}', error || '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '提交 OAuth 登录表单' })
  @ApiResponse({ status: 302, description: '登录成功：写全局会话 Cookie 后回跳 /oauth/authorize' })
  @ApiResponse({ status: 401, description: '登录失败：带 error 参数重定向回登录页' })
  async loginSubmit(@Body() dto: SsoLoginDto, @Res() res: Response) {
    try {
      const result = await this.auth.login({ username: dto.username, password: dto.password });
      const cookieCfg = {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: this.config.get<boolean>('cookie.secure') ?? false,
        maxAge: this.config.get<number>('session.ttlMs') || 86400000,
      };
      res.cookie(SESSION_COOKIE, result.sessionId, cookieCfg);

      // 有 OAuth 上下文 → 回跳 /oauth/authorize 继续授权流程
      if (dto.appId) {
        const authQuery = new URLSearchParams();
        authQuery.set('response_type', dto.response_type || 'code');
        authQuery.set('client_id', dto.appId);
        if (dto.redirectUri) authQuery.set('redirect_uri', dto.redirectUri);
        if (dto.scope) authQuery.set('scope', dto.scope);
        if (dto.state) authQuery.set('state', dto.state);
        if (dto.code_challenge) authQuery.set('code_challenge', dto.code_challenge);
        if (dto.code_challenge_method) authQuery.set('code_challenge_method', dto.code_challenge_method);
        if (dto.nonce) authQuery.set('nonce', dto.nonce);
        return res.redirect(`/oauth/authorize?${authQuery.toString()}`);
      }

      // 无 OAuth 上下文（直接访问登录页）→ 跳转 SP 首页
      return res.redirect('/sp');
    } catch (err) {
      const loginQuery = new URLSearchParams();
      if (dto.appId) loginQuery.set('client_id', dto.appId);
      if (dto.redirectUri) loginQuery.set('redirect_uri', dto.redirectUri);
      if (dto.scope) loginQuery.set('scope', dto.scope);
      if (dto.state) loginQuery.set('state', dto.state);
      loginQuery.set('error', (err as Error).message || '登录失败');
      return res.redirect(`/oauth/login?${loginQuery.toString()}`);
    }
  }

  @Public()
  @Get('endsession')
  @ApiOperation({ summary: 'OIDC RP-Initiated Logout' })
  @ApiQuery({ name: 'id_token_hint', required: true, description: 'ID Token（用于标识待登出的会话）', example: 'eyJhbGciOi...' })
  @ApiQuery({ name: 'post_logout_redirect_uri', required: false, description: '登出后的回调地址' })
  @ApiQuery({ name: 'state', required: false, description: '透传状态值' })
  @ApiResponse({ status: 302, description: '登出成功：302 跳转至 post_logout_redirect_uri' })
  @ApiResponse({ status: 401, description: 'id_token_hint 无效' })
  async endSession(
    @Query('id_token_hint') idTokenHint: string,
    @Query('post_logout_redirect_uri') postLogoutRedirectUri: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!idTokenHint) {
      throw new NotFoundException('缺少 id_token_hint');
    }

    try {
      await this.auth.endSession(idTokenHint);
    } catch (err) {
      throw new UnauthorizedException((err as Error).message || '登出失败');
    }

    // 清除全局会话 Cookie
    res.clearCookie(SESSION_COOKIE);

    if (postLogoutRedirectUri) {
      const url = new URL(postLogoutRedirectUri);
      if (state) url.searchParams.set('state', state);
      return res.redirect(url.toString());
    }

    return res.status(200).json({ ok: true });
  }

  /**
   * 将 Hex 颜色加深指定比例，用于生成按钮渐变暗色。
   * 例如 darkenColor('#2563EB', 0.15) → '#1D4ED8'
   */
  private darkenColor(hex: string, amount: number): string {
    const clean = hex.replace('#', '');
    const r = Math.max(0, Math.floor(parseInt(clean.substring(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.floor(parseInt(clean.substring(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.floor(parseInt(clean.substring(4, 6), 16) * (1 - amount)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}