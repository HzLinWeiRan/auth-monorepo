import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EnterpriseService } from './enterprise.service';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('enterprises')
@Controller('enterprises')
@Roles(Role.SUPER_ADMIN)
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Post()
  @ApiOperation({ summary: '创建企业（超级管理员）' })
  @ApiResponse({ status: 201, description: '企业创建成功' })
  @ApiResponse({ status: 409, description: '企业标识已存在' })
  create(@Body() dto: CreateEnterpriseDto) {
    return this.enterpriseService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '企业列表（超级管理员）' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 20 })
  @ApiResponse({ status: 200, description: '企业列表' })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.enterpriseService.findAll(page || 1, pageSize || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '企业详情（超级管理员）' })
  @ApiResponse({ status: 200, description: '企业详情' })
  @ApiResponse({ status: 404, description: '企业不存在' })
  findById(@Param('id') id: string) {
    return this.enterpriseService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新企业（超级管理员）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '企业不存在' })
  @ApiResponse({ status: 409, description: '企业标识已存在' })
  update(@Param('id') id: string, @Body() dto: UpdateEnterpriseDto) {
    return this.enterpriseService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除企业（超级管理员，软删除为 disabled）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '企业不存在' })
  remove(@Param('id') id: string) {
    return this.enterpriseService.remove(id);
  }
}