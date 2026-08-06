import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService, PublicUser } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { EnterpriseService } from '../enterprise/enterprise.service';
import { AppService } from '../app/app.service';
import { LoginActivity } from '../auth/login-activity.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly enterprises: EnterpriseService,
    private readonly apps: AppService,
    @InjectRepository(LoginActivity)
    private readonly loginActivityRepo: Repository<LoginActivity>,
  ) {}

  /**
   * 管理后台登录：校验用户名密码 + 角色检查。
   * 仅 super_admin 或 enterprise_admin 可登录管理后台。
   */
  async adminLogin(dto: AdminLoginDto) {
    const result = await this.auth.login(dto);

    const userRoles = result.user.roles?.split(',').map((r) => r.trim()) || [];
    if (
      !userRoles.includes(Role.SUPER_ADMIN) &&
      !userRoles.includes(Role.ENTERPRISE_ADMIN)
    ) {
      throw new ForbiddenException('无管理后台权限');
    }

    return result;
  }

  /** 获取当前管理员信息（从 JWT 解析，此处仅做格式转换） */
  async getMe(user: PublicUser) {
    return user;
  }

  /** 系统概览（超级管理员）：返回企业数、应用数、用户总数 */
  async overview() {
    const [enterprises, totalUserCount] = await Promise.all([
      this.enterprises.findAll(1, 1000),
      this.users.countAll(),
    ]);
    const allApps = await this.apps.findAll();

    return {
      enterpriseCount: enterprises.total,
      appCount: allApps.length,
      totalUserCount,
      timestamp: new Date().toISOString(),
    };
  }

  /** 企业管理员：获取本企业用户列表 */
  async getEnterpriseUsers(
    enterpriseId: string,
    page = 1,
    pageSize = 20,
    search?: string,
  ) {
    return this.users.findByEnterpriseId(enterpriseId, page, pageSize, search);
  }

  /** 企业管理员：创建本企业用户 */
  async createEnterpriseUser(enterpriseId: string, dto: AdminCreateUserDto) {
    return this.users.createUserInEnterprise(
      { username: dto.username, password: dto.password, email: dto.email },
      enterpriseId,
      dto.roles || 'user',
    );
  }

  /** 企业管理员：更新用户 */
  async updateUser(userId: string, dto: AdminUpdateUserDto) {
    const user = await this.users.findById(userId);

    // 超级管理员账号禁止禁用、禁止改动角色
    if (this.users.isSuperAdmin(user)) {
      if (dto.isEnabled !== undefined && dto.isEnabled === false) {
        throw new ForbiddenException('无法禁用超级管理员账号');
      }
      if (dto.roles !== undefined) {
        throw new ForbiddenException('无法修改超级管理员的角色');
      }
    }

    return this.users.updateUser(userId, dto);
  }

  /** 企业管理员：删除用户（软删除） */
  async removeUser(userId: string) {
    const user = await this.users.findById(userId);

    // 超级管理员账号禁止删除
    if (this.users.isSuperAdmin(user)) {
      throw new ForbiddenException('无法删除超级管理员账号');
    }

    return this.users.removeUser(userId);
  }

  /** 企业管理员：获取本企业应用列表 */
  async getEnterpriseApps(enterpriseId: string, search?: string) {
    return this.apps.findByEnterpriseId(enterpriseId, search);
  }

  /** 企业管理员：创建本企业应用 */
  async createEnterpriseApp(enterpriseId: string, dto: any) {
    return this.apps.create(dto, enterpriseId);
  }

  /** 企业管理员：更新应用 */
  async updateEnterpriseApp(appId: string, dto: any) {
    return this.apps.update(appId, dto);
  }

  /** 企业管理员：删除应用 */
  async removeApp(appId: string) {
    return this.apps.remove(appId);
  }

  /** 企业管理员：查看本企业登录活动记录 */
  async getEnterpriseActivity(
    enterpriseId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: LoginActivity[]; total: number }> {
    const [items, total] = await this.loginActivityRepo.findAndCount({
      where: { enterpriseId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }
}