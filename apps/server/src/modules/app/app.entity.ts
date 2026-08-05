import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../enterprise/enterprise.entity';

/**
 * 业务系统（SP / Service Provider）实体。
 * 每个接入 SSO 的应用在此注册，获取 appId 与 secret 作为信任凭据，
 * 并配置登录回调地址 redirectUri 与单点登出回调地址 logoutCallbackUrl。
 */
@Entity('apps')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 应用标识，SP 调用 IdP 接口时携带 */
  @Index({ unique: true })
  @Column({ name: 'app_id', unique: true })
  appId: string;

  /** 应用名称（展示用） */
  @Column({ length: 128 })
  name: string;

  /** 应用密钥，用于 SP 与 IdP 之间的签名/信任校验 */
  @Column()
  secret: string;

  /** RSA 公钥（PEM 格式），通过 JWKS 端点公开，SP 用于本地验签 */
  @Column({ name: 'public_key', type: 'text' })
  publicKey: string;

  /** RSA 私钥（PEM 格式），仅 SSO 内部使用，创建应用时返回一次 */
  @Column({ name: 'private_key', type: 'text' })
  privateKey: string;

  /** Key ID，格式 app_{appId}_{timestamp}，用于 JWT header 标识验签公钥 */
  @Index({ unique: true })
  @Column({ unique: true })
  kid: string;

  /** 登录成功后的回调地址（SSO 携带 ticket 302 跳转至此） */
  @Column({ name: 'redirect_uri' })
  redirectUri: string;

  /** 单点登出（SLO）时 IdP 广播通知的回调地址 */
  @Column({ name: 'logout_callback_url', nullable: true })
  logoutCallbackUrl: string;

  /** OAuth 2.0 允许的 grant_types（JSON 数组） */
  @Column({ name: 'grant_types', type: 'text', nullable: true })
  grantTypes: string;

  /** OAuth 2.0 允许的 scopes（JSON 数组，如 '["openid","profile","email"]'） */
  @Column({ type: 'text', nullable: true })
  scopes: string;

  /** OAuth 2.0 多回调地址（JSON 数组，优先于 redirectUri 单字段） */
  @Column({ name: 'redirect_uris', type: 'text', nullable: true })
  redirectUris: string;

  /** 应用类型：web（Web 应用）或 native（原生应用） */
  @Column({ name: 'application_type', length: 16, default: 'web' })
  applicationType: string;

  /** Token 端点认证方式：client_secret_post / client_secret_basic */
  @Column({ name: 'token_endpoint_auth_method', length: 32, default: 'client_secret_post' })
  tokenEndpointAuthMethod: string;

  /** OIDC RP-Initiated Logout 允许的回调地址（JSON 数组） */
  @Column({ name: 'post_logout_redirect_uris', type: 'text', nullable: true })
  postLogoutRedirectUris: string;

  // ---- 个性化登录页品牌字段 ----

  /** 应用 Logo URL（展示在登录页左上角），为空则使用默认盾牌图标 */
  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  /** 品牌主色（Hex），如 #2563EB。为空则使用默认蓝色 */
  @Column({ name: 'primary_color', length: 7, nullable: true })
  primaryColor: string;

  /** 所属企业 ID（null 表示平台级应用） */
  @Index()
  @Column({ name: 'enterprise_id', nullable: true })
  enterpriseId: string;

  @ManyToOne(() => Enterprise, { nullable: true })
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
