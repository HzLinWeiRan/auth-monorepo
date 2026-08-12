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

  /** 软删除标记：true 表示已删除，查询时排除 */
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  /** 启用标记：true 表示正常启用，false 表示已禁用，该企业下所有用户无法登录 */
  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
