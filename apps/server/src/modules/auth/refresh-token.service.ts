import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID, createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { RefreshToken } from './refresh-token.entity';

export interface CreateRefreshTokenParams {
  clientId: string;
  userId: string;
  sessionId: string;
  scopes: string[];
  ttlMs: number;
}

export interface RotateResult {
  accessToken: string;
  refreshToken: string;
  family: string;
  scopes: string[];
}

/**
 * Refresh Token 服务，支持 rotation 与 reuse detection。
 * - 每次使用 refresh_token 后签发新 token，旧 token 标记为 used
 * - 同一 family 的 token 被重复使用时，认定泄露，整个 family 失效
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 签发 refresh_token 并存储 hash */
  async create(params: CreateRefreshTokenParams): Promise<{
    refreshToken: string;
    family: string;
  }> {
    const family = randomUUID();
    const refreshExpiresIn = (this.config.get<string>('jwt.refreshExpiresIn') ||
      '7d') as StringValue;

    const refreshToken = this.jwt.sign(
      {
        sub: params.userId,
        clientId: params.clientId,
        sessionId: params.sessionId,
        scopes: params.scopes.join(' '),
        family,
        type: 'refresh_token',
        jti: randomUUID(),
      },
      { expiresIn: refreshExpiresIn },
    );

    const tokenHash = this.hashToken(refreshToken);
    const ttlMs = this.parseDurationToMs(refreshExpiresIn);

    const entity = this.repo.create({
      tokenHash,
      clientId: params.clientId,
      userId: params.userId,
      sessionId: params.sessionId,
      scopes: JSON.stringify(params.scopes),
      expiresAt: new Date(Date.now() + ttlMs),
      used: false,
      family,
    });
    await this.repo.save(entity);

    return { refreshToken, family };
  }

  /**
   * Refresh Token rotation：校验旧 token → 标记 used → 签发新 token。
   * 如果检测到 reuse（同一 family 中已存在 used token 被再次使用），
   * 则失效整个 family（防止 token 泄露）。
   */
  async rotate(token: string, clientId: string): Promise<RotateResult> {
    const tokenHash = this.hashToken(token);

    // 解码 token 获取 family（不验签，先查 DB）
    let family: string | undefined;
    try {
      const decoded = this.jwt.decode(token) as { family?: string };
      family = decoded?.family;
    } catch {
      throw new UnauthorizedException('Refresh Token 无效');
    }

    if (!family) {
      throw new UnauthorizedException('Refresh Token 缺少 family');
    }

    const entity = await this.repo.findOne({ where: { tokenHash } });
    if (!entity) {
      throw new UnauthorizedException('Refresh Token 不存在');
    }
    if (entity.expiresAt.getTime() < Date.now()) {
      await this.repo.remove(entity);
      throw new UnauthorizedException('Refresh Token 已过期');
    }
    if (entity.clientId !== clientId) {
      throw new UnauthorizedException('Refresh Token 与客户端不匹配');
    }

    // Reuse detection：如果 token 已被使用过，说明可能被盗，失效整个 family
    if (entity.used) {
      await this.repo.delete({ family: entity.family });
      throw new UnauthorizedException(
        'Refresh Token 已被使用（可能泄露），已失效整个 family',
      );
    }

    // 标记旧 token 为 used
    entity.used = true;
    await this.repo.save(entity);

    // 签发新 token（同一 family，加 jti 防 hash 碰撞）
    const scopes = JSON.parse(entity.scopes);
    const refreshExpiresIn = (this.config.get<string>('jwt.refreshExpiresIn') ||
      '7d') as StringValue;
    const newRefreshToken = this.jwt.sign(
      {
        sub: entity.userId,
        clientId: entity.clientId,
        sessionId: entity.sessionId,
        scopes: scopes.join(' '),
        family: entity.family,
        type: 'refresh_token',
        jti: randomUUID(),
      },
      { expiresIn: refreshExpiresIn },
    );

    const newTokenHash = this.hashToken(newRefreshToken);
    const ttlMs = this.parseDurationToMs(refreshExpiresIn);
    const newEntity = this.repo.create({
      tokenHash: newTokenHash,
      clientId: entity.clientId,
      userId: entity.userId,
      sessionId: entity.sessionId,
      scopes: entity.scopes,
      expiresAt: new Date(Date.now() + ttlMs),
      used: false,
      family: entity.family,
    });
    await this.repo.save(newEntity);

    return {
      accessToken: '', // 由 AuthService 签发
      refreshToken: newRefreshToken,
      family: entity.family,
      scopes,
    };
  }

  /** 失效某用户的所有 refresh tokens */
  async revokeByUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  /** 失效单个 refresh token */
  async revokeByToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.repo.delete({ tokenHash });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationToMs(value: string): number {
    const matched = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
    if (!matched) return 604800000; // 默认 7 天
    const n = parseInt(matched[1], 10);
    switch (matched[2]) {
      case 's':
        return n * 1000;
      case 'm':
        return n * 60000;
      case 'h':
        return n * 3600000;
      case 'd':
        return n * 86400000;
      default:
        return n * 1000;
    }
  }
}
