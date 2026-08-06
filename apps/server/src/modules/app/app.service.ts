import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { randomBytes } from 'crypto';
import { App } from './app.entity';
import { CreateAppDto } from './dto/create-app.dto';
import { KeyService } from '../auth/key.service';

/**
 * SP 应用管理服务：注册（生成 appId/secret/RSA 密钥对）、查询、列表、删除。
 */
@Injectable()
export class AppService {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    private readonly keyService: KeyService,
  ) {}

  /** 注册应用：自动生成 appId、secret 与 RSA-2048 密钥对（私钥仅注册时返回一次） */
  async create(dto: CreateAppDto, enterpriseId?: string): Promise<App> {
    const appId = `app_${randomBytes(8).toString('hex')}`;
    const { publicKey, privateKey, kid } = this.keyService.generateKeyPair(appId);

    const app = this.appRepo.create({
      appId,
      secret: randomBytes(24).toString('hex'),
      publicKey,
      privateKey,
      kid,
      name: dto.name,
      redirectUri: dto.redirectUri,
      logoutCallbackUrl: dto.logoutCallbackUrl,
      grantTypes: dto.grantTypes || JSON.stringify(['authorization_code', 'refresh_token']),
      scopes: dto.scopes || JSON.stringify(['openid', 'profile', 'email']),
      redirectUris: dto.redirectUris || null,
      applicationType: dto.applicationType || 'web',
      tokenEndpointAuthMethod: dto.tokenEndpointAuthMethod || 'client_secret_post',
      postLogoutRedirectUris: dto.postLogoutRedirectUris || null,
      logoUrl: dto.logoUrl || null,
      primaryColor: dto.primaryColor || null,
      enterpriseId: enterpriseId || null,
    });
    return this.appRepo.save(app);
  }

  /** 应用列表（不返回 secret 和 privateKey），可选按企业过滤 */
  async findAll(enterpriseId?: string): Promise<Omit<App, 'secret' | 'privateKey'>[]> {
    const apps = await this.appRepo.find({
      where: enterpriseId ? { enterpriseId } : {},
      order: { createdAt: 'DESC' },
    });
    return apps.map(({ secret: _s, privateKey: _pk, ...rest }) => rest);
  }

  /** 按 appId 查询单个应用（不返回 secret 和 privateKey） */
  async findByAppId(appId: string): Promise<Omit<App, 'secret' | 'privateKey'>> {
    const app = await this.appRepo.findOne({ where: { appId } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }
    const { secret: _s, privateKey: _pk, ...rest } = app;
    return rest;
  }

  /** 删除应用 */
  async remove(appId: string): Promise<void> {
    const result = await this.appRepo.delete({ appId });
    if (!result.affected) {
      throw new NotFoundException('应用不存在');
    }
  }

  /** 获取企业下应用列表（支持搜索） */
  async findByEnterpriseId(enterpriseId: string, search?: string): Promise<App[]> {
    return this.appRepo.find({
      where: search
        ? [
            { enterpriseId, name: Like(`%${search}%`) },
            { enterpriseId, appId: Like(`%${search}%`) },
          ]
        : { enterpriseId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 更新应用（可编辑名称、回调地址、品牌配置等业务字段） */
  async update(appId: string, dto: { name?: string; redirectUri?: string; logoutCallbackUrl?: string; logoUrl?: string; primaryColor?: string }): Promise<App> {
    const app = await this.appRepo.findOne({ where: { appId } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }
    Object.assign(app, dto);
    return this.appRepo.save(app);
  }

  /** 统计企业下应用数 */
  async countByEnterpriseId(enterpriseId: string): Promise<number> {
    return this.appRepo.count({ where: { enterpriseId } });
  }

  /** 确保存在指定 appId 的应用（不存在则注册并生成密钥对，存在则更新回调地址）。用于内置演示端自动初始化。 */
  async ensureApp(params: {
    appId: string;
    name: string;
    redirectUri: string;
    logoutCallbackUrl: string;
    redirectUris?: string;
    postLogoutRedirectUris?: string;
    grantTypes?: string;
    scopes?: string;
  }): Promise<void> {
    const existing = await this.appRepo.findOne({ where: { appId: params.appId } });
    if (existing) {
      existing.redirectUri = params.redirectUri;
      existing.logoutCallbackUrl = params.logoutCallbackUrl;
      if (params.redirectUris !== undefined) existing.redirectUris = params.redirectUris;
      if (params.postLogoutRedirectUris !== undefined) existing.postLogoutRedirectUris = params.postLogoutRedirectUris;
      if (params.grantTypes !== undefined) existing.grantTypes = params.grantTypes;
      if (params.scopes !== undefined) existing.scopes = params.scopes;
      await this.appRepo.save(existing);
      return;
    }
    const { publicKey, privateKey, kid } = this.keyService.generateKeyPair(params.appId);
    const app = this.appRepo.create({
      appId: params.appId,
      secret: randomBytes(24).toString('hex'),
      publicKey,
      privateKey,
      kid,
      name: params.name,
      redirectUri: params.redirectUri,
      logoutCallbackUrl: params.logoutCallbackUrl,
      redirectUris: params.redirectUris || null,
      postLogoutRedirectUris: params.postLogoutRedirectUris || null,
      grantTypes: params.grantTypes || JSON.stringify(['authorization_code', 'refresh_token']),
      scopes: params.scopes || JSON.stringify(['openid', 'profile', 'email']),
    });
    await this.appRepo.save(app);
  }
}
