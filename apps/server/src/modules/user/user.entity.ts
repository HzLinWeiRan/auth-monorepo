import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../enterprise/enterprise.entity';

/**
 * 用户实体：认证中心统一存储的账号信息。
 * 密码仅以 bcrypt 哈希存储，绝不落明文。
 *
 * 多租户设计：
 * - 用户名在企业内唯一（username + enterpriseId 联合唯一）
 * - enterpriseId 为 null 表示平台级账号（超级管理员）
 * - roles 逗号分隔存储角色
 */
@Entity('users')
@Unique(['username', 'enterpriseId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true, length: 128 })
  email: string;

  /** 软删除标记：true 表示已删除，查询时排除 */
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  /** 启用标记：true 表示正常启用，false 表示已禁用，无法登录 */
  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  /** 所属企业 ID（null 表示平台级账号，如超级管理员） */
  @Index()
  @Column({ name: 'enterprise_id', nullable: true })
  enterpriseId: string;

  @ManyToOne(() => Enterprise, { nullable: true })
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  /**
   * 角色列表，逗号分隔。
   * 可选值：super_admin, enterprise_admin, user
   */
  @Column({ type: 'varchar', length: 128, default: 'user' })
  roles: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
