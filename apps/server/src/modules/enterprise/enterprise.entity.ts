import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 企业/租户实体。
 * 不同企业的账号与应用完全隔离，通过 enterpriseId 关联。
 * 超级管理员不属于任何企业（enterpriseId = null）。
 */
@Entity('enterprises')
export class Enterprise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 企业名称 */
  @Column({ length: 128 })
  name: string;

  /** URL 友好标识，用于 API 路径与子域名路由 */
  @Index({ unique: true })
  @Column({ length: 64, unique: true })
  slug: string;

  /** 企业状态：active（正常）/ disabled（禁用，该企业下所有用户无法登录） */
  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}