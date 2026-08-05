import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as rawJwt from 'jsonwebtoken';
import { KeyService } from '../../modules/auth/key.service';

/**
 * JWT 载荷结构：签发与解析必须保持一致。
 * - sub: 用户 ID
 * - username: 用户名
 * - sessionId: 全局会话标识（用于 SLO 主动失效）
 * - enterpriseId: 所属企业 ID（null 表示平台级账号）
 * - roles: 角色列表，逗号分隔
 */
export interface JwtPayload {
  sub: string;
  username: string;
  sessionId?: string;
  enterpriseId?: string;
  roles?: string;
}

/**
 * JWT 校验策略：支持 HS256（全局密钥）与 RS256（按 kid 查应用公钥）双模式。
 *
 * 从 Authorization Bearer 头提取令牌，按 header.alg 自动选择验签方式：
 * - HS256 → 全局 JwtService 密钥
 * - RS256 → 按 header.kid 从 KeyService 获取应用公钥
 *
 * 校验通过后把载荷中的用户信息挂到 request.user，供守卫与接口使用。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly keyService: KeyService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 使用 secretOrKeyProvider 动态选择密钥
      secretOrKeyProvider: async (
        _request: any,
        rawJwtToken: string,
        done: (err: Error | null, secretOrKey?: string | Buffer) => void,
      ) => {
        try {
          const decoded = rawJwt.decode(rawJwtToken, { complete: true });
          if (decoded?.header?.alg === 'RS256' && decoded?.header?.kid) {
            const publicKey = await this.keyService.getPublicKeyByKid(
              decoded.header.kid as string,
            );
            if (publicKey) {
              return done(null, publicKey);
            }
          }
          // 默认 HS256
          return done(null, config.get<string>('jwt.secret'));
        } catch (err) {
          return done(err as Error);
        }
      },
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<{ id: string; username: string; sessionId?: string; enterpriseId?: string; roles?: string }> {
    if (!payload?.sub) {
      throw new UnauthorizedException('无效令牌');
    }
    return {
      id: payload.sub,
      username: payload.username,
      sessionId: payload.sessionId,
      enterpriseId: payload.enterpriseId,
      roles: payload.roles,
    };
  }
}
