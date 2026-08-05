import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { AuthorizationCode } from './authorization-code.entity';

export interface CreateCodeParams {
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
  nonce?: string;
  ttlMs: number;
}

export interface ConsumeCodeResult {
  userId: string;
  scopes: string[];
  nonce: string | null;
}

/**
 * OAuth 2.0 Authorization Code 服务。
 * 签发一次一用、短时效的授权码，支持 PKCE 校验。
 */
@Injectable()
export class AuthorizationCodeService {
  constructor(
    @InjectRepository(AuthorizationCode)
    private readonly repo: Repository<AuthorizationCode>,
  ) {}

  /** 签发授权码 */
  async create(params: CreateCodeParams): Promise<AuthorizationCode> {
    const code = randomBytes(32).toString('hex');
    const entity = this.repo.create({
      code,
      clientId: params.clientId,
      userId: params.userId,
      redirectUri: params.redirectUri,
      scopes: JSON.stringify(params.scopes),
      expiresAt: new Date(Date.now() + params.ttlMs),
      used: false,
      codeChallenge: params.codeChallenge || null,
      codeChallengeMethod: params.codeChallengeMethod || null,
      nonce: params.nonce || null,
    });
    return this.repo.save(entity);
  }

  /**
   * 一次性消费授权码：校验存在性、未使用、未过期、client 匹配、redirectUri 匹配、
   * PKCE 校验（如设置），校验通过后标记 used。
   */
  async consume(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<ConsumeCodeResult> {
    const entity = await this.repo.findOne({ where: { code } });
    if (!entity) {
      throw new UnauthorizedException('授权码不存在');
    }
    if (entity.used) {
      throw new UnauthorizedException('授权码已被使用');
    }
    if (entity.expiresAt.getTime() < Date.now()) {
      await this.repo.remove(entity);
      throw new UnauthorizedException('授权码已过期');
    }
    if (entity.clientId !== clientId) {
      throw new UnauthorizedException('授权码与客户端不匹配');
    }
    if (entity.redirectUri !== redirectUri) {
      throw new UnauthorizedException('回调地址与授权请求不一致');
    }

    // PKCE 校验
    if (entity.codeChallenge) {
      if (!codeVerifier) {
        throw new UnauthorizedException('缺少 code_verifier（PKCE 要求）');
      }
      const valid = this.verifyPkce(
        codeVerifier,
        entity.codeChallenge,
        entity.codeChallengeMethod || 'S256',
      );
      if (!valid) {
        throw new UnauthorizedException('code_verifier 不匹配');
      }
    }

    entity.used = true;
    await this.repo.save(entity);

    return {
      userId: entity.userId,
      scopes: JSON.parse(entity.scopes),
      nonce: entity.nonce,
    };
  }

  /** 使某用户的所有授权码失效（SLO 时调用） */
  async invalidateByUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  /**
   * PKCE 校验：S256 → BASE64URL(SHA256(code_verifier)) === code_challenge。
   * plain → 直接比较。
   */
  private verifyPkce(
    verifier: string,
    challenge: string,
    method: string,
  ): boolean {
    if (method === 'S256') {
      const hash = createHash('sha256').update(verifier).digest();
      const computed = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return computed === challenge;
    }
    // plain
    return verifier === challenge;
  }
}