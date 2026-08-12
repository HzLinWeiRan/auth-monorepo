import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * Refresh Token 实体，支持 rotation 与 reuse detection。
 * 每次使用 refresh_token 换取新 access_token 时：
 *  1. 旧 token 标记为 used
 *  2. 签发新 token（同一 family）
 *  3. 如果检测到同一 family 中已存在 used token 被再次使用（可能被盗），
 *     则失效整个 family
 *
 * 存储的是 refresh_token JWT 的 SHA-256 哈希，而非原始 token，
 * 防止数据库泄露后直接使用 token。
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** refresh_token JWT 的 SHA-256 哈希 */
  @Index({ unique: true })
  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  /** 客户端标识（OAuth client_id） */
  @Index()
  @Column({ name: 'client_id' })
  clientId: string;

  /** 归属用户 */
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  /** 关联的全局会话标识 */
  @Column({ name: 'session_id' })
  sessionId: string;

  /** 授权的作用域（JSON 数组） */
  @Column({ type: 'text' })
  scopes: string;

  /** 过期时间（绝对时间） */
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  /** 是否已使用（rotation：每次刷新后标记，下次使用前检查） */
  @Column({ default: false })
  used: boolean;

  /**
   * Token family ID（UUID），用于 rotation 的 reuse detection：
   * 同一 family 的 token 被重复使用时，认定 token 泄露，整个 family 失效。
   */
  @Index()
  @Column()
  family: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
