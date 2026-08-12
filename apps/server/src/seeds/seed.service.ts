import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Enterprise } from '../modules/enterprise/enterprise.entity';
import { User } from '../modules/user/user.entity';

/**
 * 种子数据服务：在模块初始化时幂等创建默认企业和管理员账号。
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Enterprise)
    private readonly enterpriseRepo: Repository<Enterprise>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedEnterprises();
    await this.seedUsers();
    this.logger.log('种子数据初始化完成');
  }

  /** 确保默认企业存在 */
  private async seedEnterprises(): Promise<Enterprise> {
    let enterprise = await this.enterpriseRepo.findOne({
      where: { slug: 'default' },
    });
    if (!enterprise) {
      enterprise = this.enterpriseRepo.create({
        name: '默认企业',
        slug: 'default',
      });
      enterprise = await this.enterpriseRepo.save(enterprise);
      this.logger.log('已创建默认企业');
    }
    return enterprise;
  }

  /** 确保超级管理员和企业管理员存在 */
  private async seedUsers(): Promise<void> {
    // 超级管理员（不属于任何企业）
    const superAdmin = await this.userRepo.findOne({
      where: { username: 'admin', enterpriseId: null as any },
    });
    if (!superAdmin) {
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      const user = this.userRepo.create({
        username: 'admin',
        passwordHash,
        roles: 'super_admin',
        enterpriseId: null,
      });
      await this.userRepo.save(user);
      this.logger.log('已创建超级管理员: admin / Admin@123');
    }

    // 企业管理员（属于默认企业）
    const enterprise = await this.enterpriseRepo.findOne({
      where: { slug: 'default' },
    });
    if (enterprise) {
      const entAdmin = await this.userRepo.findOne({
        where: { username: 'entadmin', enterpriseId: enterprise.id },
      });
      if (!entAdmin) {
        const passwordHash = await bcrypt.hash('Admin@123', 10);
        const user = this.userRepo.create({
          username: 'entadmin',
          passwordHash,
          roles: 'enterprise_admin',
          enterpriseId: enterprise.id,
        });
        await this.userRepo.save(user);
        this.logger.log('已创建企业管理员: entadmin / Admin@123');
      }
    }
  }
}
