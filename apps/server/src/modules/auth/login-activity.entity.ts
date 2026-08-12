import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 登录活动记录：记录每次用户通过 OAuth 登录的事件。
 * 企业管理员可通过此表查看本企业下普通用户的登录历史。
 */
@Entity('login_activities')
export class LoginActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ length: 64 })
  username: string;

  @Index()
  @Column({ name: 'enterprise_id', type: 'varchar', length: 36, nullable: true })
  enterpriseId: string | null;

  @Column({ name: 'app_id', nullable: true, length: 64 })
  appId: string;

  @Column({ name: 'app_name', nullable: true, length: 128 })
  appName: string;

  @Column({ name: 'ip_address', nullable: true, length: 45 })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
