import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../common/enums/role.enum';

/**
 * 用户服务：负责账号注册、查询与密码校验。
 * 密码一律以 bcrypt 哈希存储，绝不接触明文。
 *
 * 多租户：用户名在企业内唯一，企业间隔离。
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 注册新用户（需指定所属企业） */
  async register(dto: RegisterDto, enterpriseId?: string, roles?: string): Promise<User> {
    const exists = await this.userRepo.findOne({
      where: enterpriseId
        ? { username: dto.username, enterpriseId }
        : { username: dto.username },
    });
    if (exists) {
      throw new ConflictException(
        enterpriseId ? '该企业内用户名已存在' : '用户名已存在',
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      email: dto.email,
      enterpriseId: enterpriseId || null,
      roles: roles || (enterpriseId ? 'user' : 'super_admin'),
    });
    return this.userRepo.save(user);
  }

  /** 全局查找（用于超级管理员登录，无企业上下文） */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  /** 企业内查找用户 */
  async findByUsernameAndEnterpriseId(
    username: string,
    enterpriseId: string,
  ): Promise<User | null> {
    return this.userRepo.findOne({
      where: { username, enterpriseId },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /** 分页获取企业内用户列表（排除软删除，支持搜索） */
  async findByEnterpriseId(
    enterpriseId: string,
    page = 1,
    pageSize = 20,
    search?: string,
  ): Promise<{ items: User[]; total: number }> {
    const [items, total] = await this.userRepo.findAndCount({
      where: search
        ? [
            { enterpriseId, isDeleted: false, username: Like(`%${search}%`) },
            { enterpriseId, isDeleted: false, email: Like(`%${search}%`) },
          ]
        : { enterpriseId, isDeleted: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 创建企业内用户（企业管理员使用） */
  async createUserInEnterprise(
    dto: RegisterDto,
    enterpriseId: string,
    roles = 'user',
  ): Promise<User> {
    const exists = await this.userRepo.findOne({
      where: { username: dto.username, enterpriseId },
    });
    if (exists) {
      throw new ConflictException('该企业内用户名已存在');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      email: dto.email,
      enterpriseId,
      roles,
    });
    return this.userRepo.save(user);
  }

  /** 更新用户信息 */
  async updateUser(
    id: string,
    updates: { email?: string; isEnabled?: boolean; roles?: string },
  ): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updates);
    return this.userRepo.save(user);
  }

  /** 软删除用户：标记 isDeleted = true */
  async removeUser(id: string): Promise<void> {
    const user = await this.findById(id);
    user.isDeleted = true;
    await this.userRepo.save(user);
  }

  /** 统计企业内用户数（排除软删除） */
  async countByEnterpriseId(enterpriseId: string): Promise<number> {
    return this.userRepo.count({ where: { enterpriseId, isDeleted: false } });
  }

  /** 统计所有用户数（全局，排除软删除） */
  async countAll(): Promise<number> {
    return this.userRepo.count({ where: { isDeleted: false } });
  }

  /** 校验明文密码与哈希是否匹配（禁用用户无法登录） */
  async validatePassword(user: User, plain: string): Promise<boolean> {
    if (!user.isEnabled) {
      return false;
    }
    return bcrypt.compare(plain, user.passwordHash);
  }

  /** 判断用户是否为超级管理员 */
  isSuperAdmin(user: User): boolean {
    const roles = user.roles?.split(',').map((r) => r.trim()) || [];
    return roles.includes(Role.SUPER_ADMIN);
  }
}
