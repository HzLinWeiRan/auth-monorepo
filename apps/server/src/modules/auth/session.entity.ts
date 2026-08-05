import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * 全局会话（Global Session）实体，由 IdP 统一维护。
 * 用户登录成功后生成一条全局会话，sessionId 存入 HttpOnly Cookie。
 * 所有 SP 对 Token 的校验本质上都是校验该全局会话是否有效，
 * 因此单点登出（SLO）可通过失效此会话让所有应用同时退出。
 */
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 全局会话标识，写入 HttpOnly Cookie，作为「是否登录」的唯一凭据 */
  @Index({ unique: true })
  @Column({ name: 'session_id', unique: true })
  sessionId: string;

  /** 关联用户 ID */
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  /** 会话过期时间（绝对时间） */
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
