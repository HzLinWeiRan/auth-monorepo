import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Enterprise } from './enterprise.entity';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(Enterprise)
    private readonly enterpriseRepo: Repository<Enterprise>,
  ) {}

  async create(dto: CreateEnterpriseDto): Promise<Enterprise> {
    const existing = await this.enterpriseRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('企业标识已存在');
    }
    const enterprise = this.enterpriseRepo.create(dto);
    return this.enterpriseRepo.save(enterprise);
  }

  async findAll(page = 1, pageSize = 20, search?: string): Promise<{ items: Enterprise[]; total: number }> {
    const [items, total] = await this.enterpriseRepo.findAndCount({
      where: search
        ? [
            { isDeleted: false, name: Like(`%${search}%`) },
            { isDeleted: false, slug: Like(`%${search}%`) },
          ]
        : { isDeleted: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  async findById(id: string): Promise<Enterprise> {
    const enterprise = await this.enterpriseRepo.findOne({ where: { id } });
    if (!enterprise) {
      throw new NotFoundException('企业不存在');
    }
    return enterprise;
  }

  async findBySlug(slug: string): Promise<Enterprise> {
    const enterprise = await this.enterpriseRepo.findOne({ where: { slug } });
    if (!enterprise) {
      throw new NotFoundException('企业不存在');
    }
    return enterprise;
  }

  async update(id: string, dto: UpdateEnterpriseDto): Promise<Enterprise> {
    const enterprise = await this.findById(id);
    if (dto.slug && dto.slug !== enterprise.slug) {
      const existing = await this.enterpriseRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('企业标识已存在');
      }
    }
    Object.assign(enterprise, dto);
    return this.enterpriseRepo.save(enterprise);
  }

  async remove(id: string): Promise<void> {
    const enterprise = await this.findById(id);
    // 软删除：标记 isDeleted = true
    enterprise.isDeleted = true;
    await this.enterpriseRepo.save(enterprise);
  }
}