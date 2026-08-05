import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Session } from './session.entity';

/**
 * 全局会话服务：维护 IdP 侧的统一会话状态。
 * 登录时创建，SLO 时批量失效；所有 SP 对 Token 的校验最终都落到会话有效性。
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  /** 为用户创建一条全局会话 */
  async create(userId: string, ttlMs: number): Promise<Session> {
    const session = this.repo.create({
      sessionId: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return this.repo.save(session);
  }

  /** 查询有效会话（已过期则清理并返回 null） */
  async findValid(sessionId: string): Promise<Session | null> {
    const session = await this.repo.findOne({ where: { sessionId } });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.repo.remove(session);
      return null;
    }
    return session;
  }

  /** 取用户最新一条有效会话（用于票据换取 Token 时绑定会话） */
  async findLatestValidByUser(userId: string): Promise<Session | null> {
    const sessions = await this.repo.find({ where: { userId } });
    const now = Date.now();
    const valid = sessions
      .filter((s) => s.expiresAt.getTime() > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return valid[0] ?? null;
  }

  /** 使单条会话失效 */
  async invalidate(sessionId: string): Promise<void> {
    await this.repo.delete({ sessionId });
  }

  /** 使某用户的所有会话失效（单点登出核心） */
  async invalidateByUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
