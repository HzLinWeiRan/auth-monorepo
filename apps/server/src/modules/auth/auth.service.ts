import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as rawJwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { App } from '../app/app.entity';
import { SessionService } from './session.service';
import { KeyService } from './key.service';
import { AuthorizationCodeService } from './authorization-code.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginDto } from '../user/dto/login.dto';
import { ValidateDto } from './dto/validate.dto';
import { TokenRequestDto } from './dto/oauth/token-request.dto';
import { UserInfoResponseDto } from './dto/oauth/userinfo-response.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PublicUser {
  id: string;
  username: string;
  email?: string;
  status?: string;
  enterpriseId?: string;
  roles?: string;
}

/**
 * 认证核心服务（OAuth 2.0 / OIDC 标准）：
 *  - 登录：校验身份 → 建立全局会话 → 签发双 Token（Access + Refresh）
 *  - 校验：依据全局会话判断 Token 是否有效，支持 HS256 与 RS256 双模式
 *  - 会话探活：轻量校验全局会话是否存活（供 SP 定时调用）
 *  - OAuth 2.0 授权：签发 Authorization Code → 兑换 Token → 刷新 Token
 *  - OIDC：签发 id_token、UserInfo、Discovery、Introspection、Revocation
 *  - 单点登出（SLO）：失效全局会话并广播通知所有业务系统
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserService,
    private readonly sessions: SessionService,
    private readonly jwt: JwtService,
    private readonly keyService: KeyService,
    private readonly authorizationCodes: AuthorizationCodeService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly config: ConfigService,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
  ) {}

  private get sessionTtl(): number {
    return this.config.get<number>('session.ttlMs') || 86400000;
  }

  private get accessExpiresIn(): string {
    return this.config.get<string>('jwt.accessExpiresIn') || '15m';
  }

  private get refreshExpiresIn(): string {
    return this.config.get<string>('jwt.refreshExpiresIn') || '7d';
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      enterpriseId: user.enterpriseId,
      roles: user.roles,
    };
  }

  /**
   * 签发双 Token（Access + Refresh）。
   * - 有 appId → RS256 签名（使用该应用的私钥），JWT header 携带 kid，payload 含 email/status/appId
   * - 无 appId → HS256 签名（全局密钥），用于 SSO 内部登录
   */
  private async issueTokens(
    user: User,
    sessionId: string,
    appId?: string,
  ): Promise<TokenPair> {
    const payload: Record<string, unknown> = {
      sub: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      sessionId,
      enterpriseId: user.enterpriseId,
      roles: user.roles,
    };

    if (appId) {
      // RS256：应用专属密钥签发，SP 用公钥本地验签
      const key = await this.keyService.getPrivateKeyWithKid(appId);
      if (!key) {
        this.logger.error(`应用 ${appId} 密钥对不存在，回退 HS256`);
        return this.issueTokens(user, sessionId);
      }

      const accessPayload = { ...payload, appId };
      const accessToken = rawJwt.sign(accessPayload, key.privateKey, {
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn,
        keyid: key.kid,
      });
      const refreshToken = rawJwt.sign(
        { ...accessPayload, type: 'refresh' },
        key.privateKey,
        {
          algorithm: 'RS256',
          expiresIn: this.refreshExpiresIn,
          keyid: key.kid,
        },
      );
      return {
        accessToken,
        refreshToken,
        expiresIn: this.parseDurationToSeconds(this.accessExpiresIn),
      };
    }

    // HS256：SSO 内部登录 Token
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.accessExpiresIn,
    });
    const refreshToken = this.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: this.refreshExpiresIn },
    );
    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseDurationToSeconds(this.accessExpiresIn),
    };
  }

  /** 账号密码登录，返回全局会话标识与双 Token。
   * 支持企业作用域：有 clientId 时通过 App → Enterprise 确定企业，在该企业内查找用户。
   */
  async login(dto: LoginDto): Promise<{ sessionId: string } & TokenPair & { user: PublicUser }> {
    let user: User | null = null;

    // 尝试从 clientId 推导企业上下文
    if ((dto as any).clientId) {
      const app = await this.appRepo.findOne({ where: { appId: (dto as any).clientId } });
      if (app?.enterpriseId) {
        user = await this.users.findByUsernameAndEnterpriseId(dto.username, app.enterpriseId);
      }
    }

    // 回退到全局查找（超级管理员、无企业上下文场景）
    if (!user) {
      user = await this.users.findByUsername(dto.username);
    }

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const ok = await this.users.validatePassword(user, dto.password);
    if (!ok) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const session = await this.sessions.create(user.id, this.sessionTtl);
    const tokens = await this.issueTokens(user, session.sessionId);
    return { sessionId: session.sessionId, ...tokens, user: this.toPublicUser(user) };
  }

  /**
   * 校验 Token：按 JWT header alg 自动分发验签方式。
   * - HS256 → 全局 JwtService 验签（SSO 内部登录 Token）
   * - RS256 → 按 header kid 查应用公钥验签（SP Token）
   * 验签通过后查全局会话与用户信息。
   */
  async validateToken(dto: ValidateDto): Promise<{ valid: boolean; user?: PublicUser }> {
    const decoded = rawJwt.decode(dto.token, { complete: true });
    if (!decoded) return { valid: false };

    let payload: { sub: string; sessionId?: string };

    try {
      if (decoded.header.alg === 'RS256') {
        const kid = decoded.header.kid;
        if (!kid) return { valid: false };
        const publicKey = await this.keyService.getPublicKeyByKid(kid);
        if (!publicKey) return { valid: false };
        payload = rawJwt.verify(dto.token, publicKey, {
          algorithms: ['RS256'],
        }) as { sub: string; sessionId?: string };
      } else {
        // HS256（默认回退：SSO 内部登录 Token）
        payload = this.jwt.verify(dto.token);
      }
    } catch {
      return { valid: false };
    }

    const session = payload.sessionId
      ? await this.sessions.findValid(payload.sessionId)
      : null;
    if (!session) {
      return { valid: false };
    }
    try {
      const user = await this.users.findById(payload.sub);
      return { valid: true, user: this.toPublicUser(user) };
    } catch {
      return { valid: false };
    }
  }

  /**
   * 会话探活：仅判断全局会话是否仍有效（不查用户，不验 Token 签名）。
   * 供 SP 定时调用，作为本地 JWT 验签的补充，保障 SLO 实时性。
   */
  async pingSession(sessionId: string): Promise<{ alive: boolean }> {
    const session = await this.sessions.findValid(sessionId);
    return { alive: !!session };
  }

  /** 广播 SLO：向所有应用的 logoutCallbackUrl 发送登出通知（单点失败不阻塞主流程） */
  private async broadcastLogout(userId?: string): Promise<void> {
    const apps = await this.appRepo.find();
    // 仅向配置了登出回调地址的应用广播
    const targets = apps.filter((a) => a.logoutCallbackUrl);
    if (targets.length === 0) return;

    await Promise.all(
      targets.map(async (app) => {
        try {
          await fetch(app.logoutCallbackUrl as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, appId: app.appId }),
          });
        } catch (err) {
          this.logger.warn(
            `SLO 广播至应用 ${app.appId} 失败: ${(err as Error).message}`,
          );
        }
      }),
    );
  }

  private get idTokenExpiresIn(): string {
    return this.config.get<string>('jwt.idTokenExpiresIn') || '1h';
  }

  private get issuer(): string {
    return this.config.get<string>('issuer') || 'http://localhost:3000';
  }

  private get authorizationCodeTtl(): number {
    return this.config.get<number>('oauth.authorizationCodeTtlMs') || 60000;
  }

  // ==================== OAuth 2.0 / OIDC 方法 ====================

  /**
   * 处理 OAuth 2.0 授权请求（/oauth/authorize）。
   * 校验 client_id、redirect_uri、scope → 生成 authorization code → 返回 code 供 302 回调使用。
   */
  async authorize(params: {
    clientId: string;
    redirectUri: string;
    scope?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    nonce?: string;
    userId: string; // 从全局会话中获取
  }): Promise<{ code: string }> {
    const app = await this.appRepo.findOne({ where: { appId: params.clientId } });
    if (!app) {
      throw new NotFoundException('未知应用');
    }

    // 校验 redirect_uri
    const allowedUris = this.getRedirectUris(app);
    if (!allowedUris.includes(params.redirectUri)) {
      throw new UnauthorizedException('回调地址与应用配置不一致');
    }

    // 校验 scope
    const allowedScopes = this.getAllowedScopes(app);
    const requestedScopes = (params.scope || 'openid').split(' ').filter(Boolean);
    for (const s of requestedScopes) {
      if (!allowedScopes.includes(s)) {
        throw new UnauthorizedException(`不允许的 scope: ${s}`);
      }
    }

    const authCode = await this.authorizationCodes.create({
      clientId: params.clientId,
      userId: params.userId,
      redirectUri: params.redirectUri,
      scopes: requestedScopes,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      nonce: params.nonce,
      ttlMs: this.authorizationCodeTtl,
    });

    return { code: authCode.code };
  }

  /**
   * 用 authorization code 换取 tokens（/oauth/token, grant_type=authorization_code）。
   */
  async exchangeAuthorizationCode(dto: TokenRequestDto): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    id_token?: string;
    scope: string;
  }> {
    const app = await this.appRepo.findOne({ where: { appId: dto.client_id } });
    if (!app) {
      throw new UnauthorizedException('未知应用');
    }
    if (app.secret !== dto.client_secret) {
      throw new UnauthorizedException('客户端密钥错误');
    }

    const result = await this.authorizationCodes.consume(
      dto.code,
      dto.client_id,
      dto.redirect_uri,
      dto.code_verifier,
    );

    const user = await this.users.findById(result.userId);
    const session = await this.sessions.findLatestValidByUser(result.userId);
    if (!session) {
      throw new UnauthorizedException('全局会话已失效，请重新登录');
    }

    const appId = dto.client_id;
    const scopes = result.scopes;

    // 签发 access_token
    const tokenPayload: Record<string, unknown> = {
      sub: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      sessionId: session.sessionId,
      appId,
      scope: scopes.join(' '),
      aud: appId,
      iss: this.issuer,
    };

    let accessToken: string;
    let kid: string | undefined;
    const key = await this.keyService.getPrivateKeyWithKid(appId);
    if (key) {
      kid = key.kid;
      accessToken = rawJwt.sign(tokenPayload, key.privateKey, {
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn,
        keyid: key.kid,
      });
    } else {
      accessToken = this.jwt.sign(tokenPayload, {
        expiresIn: this.accessExpiresIn,
      });
    }

    const expiresIn = this.parseDurationToSeconds(this.accessExpiresIn);

    // 签发 refresh_token（使用 RefreshTokenService）
    const rtResult = await this.refreshTokens.create({
      clientId: appId,
      userId: user.id,
      sessionId: session.sessionId,
      scopes,
      ttlMs: this.parseDurationToMs(this.refreshExpiresIn),
    });

    // 签发 id_token（scope 含 openid 时）
    let idToken: string | undefined;
    if (scopes.includes('openid')) {
      idToken = await this.buildIdToken(
        user,
        appId,
        kid,
        result.nonce,
        session.createdAt,
        accessToken,
      );
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: rtResult.refreshToken,
      id_token: idToken,
      scope: scopes.join(' '),
    };
  }

  /**
   * 处理 refresh_token grant（/oauth/token, grant_type=refresh_token）。
   */
  async oauthRefresh(dto: TokenRequestDto): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
  }> {
    const app = await this.appRepo.findOne({ where: { appId: dto.client_id } });
    if (!app) {
      throw new UnauthorizedException('未知应用');
    }
    if (app.secret !== dto.client_secret) {
      throw new UnauthorizedException('客户端密钥错误');
    }

    const rotateResult = await this.refreshTokens.rotate(dto.refresh_token, dto.client_id);

    // 从 refresh token 解码获取 sub，再从 DB 查询完整的用户信息
    let userId: string;
    let sessionId: string;
    let user: User;
    try {
      const decoded = this.jwt.decode(dto.refresh_token) as Record<string, unknown>;
      if (!decoded?.sub) {
        throw new UnauthorizedException('Refresh Token 缺少 sub');
      }
      userId = decoded.sub as string;
      sessionId = decoded.sessionId as string;
      user = await this.users.findById(userId);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Refresh Token 无效');
    }
    const tokenPayload: Record<string, unknown> = {
      sub: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      sessionId,
      appId: dto.client_id,
      scope: rotateResult.scopes.join(' '),
      aud: dto.client_id,
      iss: this.issuer,
    };

    let accessToken: string;
    const key = await this.keyService.getPrivateKeyWithKid(dto.client_id);
    if (key) {
      accessToken = rawJwt.sign(tokenPayload, key.privateKey, {
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn,
        keyid: key.kid,
      });
    } else {
      accessToken = this.jwt.sign(tokenPayload, {
        expiresIn: this.accessExpiresIn,
      });
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.parseDurationToSeconds(this.accessExpiresIn),
      refresh_token: rotateResult.refreshToken,
      scope: rotateResult.scopes.join(' '),
    };
  }

  /**
   * 构造 id_token（JWT，OIDC 标准 claims）。
   */
  async buildIdToken(
    user: User,
    clientId: string,
    kid?: string,
    nonce?: string | null,
    authTime?: Date,
    accessToken?: string,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      iss: this.issuer,
      sub: user.id,
      aud: clientId,
      exp: now + this.parseDurationToSeconds(this.idTokenExpiresIn),
      iat: now,
      auth_time: authTime ? Math.floor(authTime.getTime() / 1000) : now,
    };

    if (nonce) {
      payload.nonce = nonce;
    }

    // at_hash: access_token 的 SHA-256 哈希左半截（Base64URL）
    if (accessToken) {
      const hash = createHash('sha256').update(accessToken).digest();
      payload.at_hash = hash
        .slice(0, 16)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    // 用户 claims（按 scope 由调用方决定是否包含；这里统一加入 username/email）
    if (user.username) {
      payload.preferred_username = user.username;
    }
    if (user.email) {
      payload.email = user.email;
      payload.email_verified = false; // 当前未实现邮箱验证
    }

    const key = await this.keyService.getPrivateKeyWithKid(clientId);
    if (key && kid) {
      return rawJwt.sign(payload, key.privateKey, {
        algorithm: 'RS256',
        keyid: kid,
      });
    }
    return this.jwt.sign(payload);
  }

  /**
   * 构建 OIDC UserInfo 响应（按 scope 返回 claims）。
   */
  buildUserInfo(user: User, scopes: string[]): UserInfoResponseDto {
    const result: UserInfoResponseDto = { sub: user.id };

    if (scopes.includes('profile')) {
      result.name = user.username;
      result.preferred_username = user.username;
    }
    if (scopes.includes('email') && user.email) {
      result.email = user.email;
      result.email_verified = false;
    }

    return result;
  }

  /**
   * Token Introspection（RFC 7662）。
   * 解码 token → 查全局会话 → 返回 active 状态与元信息。
   */
  async introspect(token: string): Promise<{
    active: boolean;
    scope?: string;
    client_id?: string;
    username?: string;
    sub?: string;
    exp?: number;
    iat?: number;
  }> {
    let payload: Record<string, unknown> | null = null;
    try {
      // 尝试 RS256 验签（按 kid 查公钥）
      const decoded = rawJwt.decode(token, { complete: true });
      if (decoded && decoded.header.alg === 'RS256' && decoded.header.kid) {
        const publicKey = await this.keyService.getPublicKeyByKid(decoded.header.kid as string);
        if (publicKey) {
          payload = rawJwt.verify(token, publicKey, { algorithms: ['RS256'] }) as Record<string, unknown>;
        }
      }
      if (!payload) {
        payload = this.jwt.verify(token) as Record<string, unknown>;
      }
    } catch {
      return { active: false };
    }

    const sessionId = payload.sessionId as string | undefined;
    if (sessionId) {
      const session = await this.sessions.findValid(sessionId);
      if (!session) {
        return { active: false };
      }
    }

    return {
      active: true,
      scope: payload.scope as string,
      client_id: payload.appId as string,
      username: payload.username as string,
      sub: payload.sub as string,
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  }

  /**
   * Token Revocation（RFC 7009）。
   * 仅支持吊销 refresh_token。
   */
  async revoke(token: string, clientId: string): Promise<void> {
    // 尝试解码获取 client 信息
    try {
      const decoded = this.jwt.decode(token) as { clientId?: string };
      if (decoded?.clientId && decoded.clientId !== clientId) {
        throw new UnauthorizedException('Token 与客户端不匹配');
      }
    } catch {
      // 解码失败也继续尝试吊销
    }
    await this.refreshTokens.revokeByToken(token);
  }

  /**
   * OIDC RP-Initiated Logout（GET /oauth/endsession）。
   * 验证 id_token_hint → 失效全局会话 → 广播 SLO 通知。
   */
  async endSession(idTokenHint: string): Promise<{ userId?: string }> {
    let payload: { sub?: string; sid?: string } | null = null;
    try {
      const decoded = rawJwt.decode(idTokenHint, { complete: true });
      if (decoded && decoded.header.alg === 'RS256' && decoded.header.kid) {
        const publicKey = await this.keyService.getPublicKeyByKid(decoded.header.kid as string);
        if (publicKey) {
          payload = rawJwt.verify(idTokenHint, publicKey, { algorithms: ['RS256'] }) as typeof payload;
        }
      }
      if (!payload) {
        payload = this.jwt.verify(idTokenHint) as typeof payload;
      }
    } catch {
      throw new UnauthorizedException('id_token_hint 无效');
    }

    let userId: string | undefined;
    if (payload?.sid) {
      const session = await this.sessions.findValid(payload.sid);
      userId = session?.userId;
      await this.sessions.invalidate(payload.sid);
    }
    if (payload?.sub && !userId) {
      userId = payload.sub;
    }
    if (userId) {
      await this.sessions.invalidateByUser(userId);
      await this.authorizationCodes.invalidateByUser(userId);
      await this.refreshTokens.revokeByUser(userId);
    }
    await this.broadcastLogout(userId);
    return { userId };
  }

  /** 将 '15m' / '7d' / '3600' 等过期表达式解析为秒 */
  private parseDurationToSeconds(value: string): number {
    const matched = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
    if (!matched) return 900;
    const n = parseInt(matched[1], 10);
    switch (matched[2]) {
      case 's':
        return n;
      case 'm':
        return n * 60;
      case 'h':
        return n * 3600;
      case 'd':
        return n * 86400;
      default:
        return n;
    }
  }

  /** 将 '15m' / '7d' 等过期表达式解析为毫秒 */
  private parseDurationToMs(value: string): number {
    return this.parseDurationToSeconds(value) * 1000;
  }

  /** 获取应用允许的 redirect_uris（优先 redirectUris 数组，回退 redirectUri 单字段） */
  private getRedirectUris(app: App): string[] {
    if (app.redirectUris) {
      try {
        const uris = JSON.parse(app.redirectUris);
        if (Array.isArray(uris) && uris.length > 0) return uris;
      } catch { /* fall through */ }
    }
    return [app.redirectUri];
  }

  /** 获取应用允许的 scopes */
  private getAllowedScopes(app: App): string[] {
    if (app.scopes) {
      try {
        const scopes = JSON.parse(app.scopes);
        if (Array.isArray(scopes)) return scopes;
      } catch { /* fall through */ }
    }
    return ['openid', 'profile', 'email'];
  }
}
