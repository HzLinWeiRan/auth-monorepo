import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateKeyPairSync, createPublicKey } from 'crypto';
import { App } from '../app/app.entity';

/**
 * 密钥对产出结构。
 */
export interface AppKeyPair {
  /** PEM 格式 RSA 公钥 */
  publicKey: string;
  /** PEM 格式 RSA 私钥 */
  privateKey: string;
  /** Key ID，格式 app_{appId}_{timestamp} */
  kid: string;
}

/**
 * JWK 结构（供 JWKS 端点对外暴露）。
 */
export interface JwksKey {
  kty: string;
  n: string;
  e: string;
  kid: string;
  alg: string;
  use: string;
}

/**
 * 非对称密钥管理服务：
 * - 为每个应用生成 RSA-2048 密钥对
 * - 构造 JWKS（JSON Web Key Set）供 SP 运行时获取公钥
 * - 按 appId / kid 查询私钥或公钥
 */
@Injectable()
export class KeyService {
  private readonly logger = new Logger(KeyService.name);

  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
  ) {}

  /**
   * 生成 RSA-2048 密钥对并构造 kid。
   * 密钥长度建议 2048（安全与性能平衡），生产环境可升级为 4096。
   */
  generateKeyPair(appId: string): AppKeyPair {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const kid = `app_${appId}_${Date.now()}`;

    return { publicKey, privateKey, kid };
  }

  /**
   * 按 appId 查询应用的私钥（用于签发 JWT）。
   * 私钥仅在应用注册时写入 DB，此方法仅在 SSO 内部使用。
   */
  async getPrivateKey(appId: string): Promise<string | null> {
    const app = await this.appRepo.findOne({
      where: { appId },
      select: ['privateKey'],
    });
    return app?.privateKey ?? null;
  }

  /**
   * 按 appId 查询私钥 + kid（签发 JWT 时同时需要）。
   */
  async getPrivateKeyWithKid(
    appId: string,
  ): Promise<{ privateKey: string; kid: string } | null> {
    const app = await this.appRepo.findOne({
      where: { appId },
      select: ['privateKey', 'kid'],
    });
    if (!app?.privateKey || !app?.kid) return null;
    return { privateKey: app.privateKey, kid: app.kid };
  }

  /**
   * 按 kid 查询公钥（用于验签 JWT）。
   */
  async getPublicKeyByKid(kid: string): Promise<string | null> {
    const app = await this.appRepo.findOne({
      where: { kid },
      select: ['publicKey'],
    });
    return app?.publicKey ?? null;
  }

  /**
   * 构造 JWKS（JSON Web Key Set），包含所有已注册应用的公钥。
   * 每个 SP 可通过 `GET /.well-known/jwks.json` 获取，用于本地 JWT 验签。
   */
  async getJwks(): Promise<{ keys: JwksKey[] }> {
    const apps = await this.appRepo.find({ select: ['kid', 'publicKey'] });

    // 排除无公钥的无效记录（理论上创建时一定写入）
    const validApps = apps.filter((a) => a.publicKey && a.kid);

    const keys: JwksKey[] = [];
    for (const app of validApps) {
      try {
        const pubKey = createPublicKey(app.publicKey);
        const jwk = pubKey.export({ format: 'jwk' });

        keys.push({
          kty: jwk.kty || 'RSA',
          n: jwk.n || '',
          e: jwk.e || '',
          kid: app.kid,
          alg: 'RS256',
          use: 'sig',
        });
      } catch (err) {
        this.logger.warn(
          `JWKS 构造失败，kid=${app.kid}: ${(err as Error).message}`,
        );
      }
    }

    return { keys };
  }
}
