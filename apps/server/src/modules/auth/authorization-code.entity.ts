import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * OAuth 2.0 Authorization Code 实体。
 * 用户在 IdP 已登录后，/oauth/authorize 签发一个短时效、一次性的授权码，
 * SP 凭此授权码向 /oauth/token 换取 access_token、refresh_token 与 id_token。
 * 支持 PKCE（code_challenge / code_challenge_method）和 OIDC nonce。
 */
@Entity('authorization_codes')
export class AuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 授权码，随机长字符串，SP 持此向 Token 端点换取 Token */
  @Index({ unique: true })
  @Column({ unique: true })
  code: string;

  /** 申请授权的客户端标识（OAuth client_id） */
  @Index()
  @Column({ name: 'client_id' })
  clientId: string;

  /** 授权归属用户 */
  @Column({ name: 'user_id' })
  userId: string;

  /** 授权时指定的回调地址，Token 端点需校验一致性 */
  @Column({ name: 'redirect_uri' })
  redirectUri: string;

  /** 授权的作用域（JSON 数组，如 '["openid","profile","email"]'） */
  @Column({ type: 'text' })
  scopes: string;

  /** 授权码过期时间（绝对时间，默认 60s） */
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  /** 是否已使用（一次一用） */
  @Column({ default: false })
  used: boolean;

  /** PKCE code_challenge（SHA-256 哈希后 Base64URL 编码值或明文） */
  @Column({ name: 'code_challenge', type: 'text', nullable: true })
  codeChallenge: string | null;

  /** PKCE 变换方法：'S256' 或 'plain' */
  @Column({ name: 'code_challenge_method', length: 16, nullable: true })
  codeChallengeMethod: string | null;

  /** OIDC nonce（从授权请求透传，用于 id_token 防重放） */
  @Column({ type: 'text', nullable: true })
  nonce: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}