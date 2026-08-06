import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateAppDto } from '../app/dto/create-app.dto';
import { UpdateAppDto } from '../app/dto/update-app.dto';

/**
 * 管理后台 API：超级管理员与企业管理员共用。
 * - 超级管理员端点：/admin/enterprises/*
 * - 企业管理员端点：/admin/enterprise/*（企业 ID 从 JWT 解析）
 */
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== 公开端点 ====================

  @Public()
  @Post('login')
  @ApiOperation({ operationId: 'adminLogin', summary: '管理后台登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回 accessToken 与用户信息' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  @ApiResponse({ status: 403, description: '无管理后台权限' })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.adminService.adminLogin(dto);
  }

  // ==================== 通用端点 ====================

  @Get('me')
  @ApiOperation({ operationId: 'getAdminMe', summary: '获取当前管理员信息' })
  @ApiResponse({ status: 200, description: '当前管理员信息' })
  getMe(@Req() req: Request) {
    return this.adminService.getMe(req.user as any);
  }

  // ==================== 超级管理员端点 ====================

  @Get('overview')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ operationId: 'getAdminOverview', summary: '系统概览统计（超级管理员）' })
  @ApiResponse({ status: 200, description: '概览统计信息' })
  overview() {
    return this.adminService.overview();
  }

  @Get('enterprises/:id/users')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ operationId: 'getEnterpriseUsersBySuperAdmin', summary: '企业下用户列表（超级管理员）' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiResponse({ status: 200, description: '用户列表' })
  getEnterpriseUsersBySuperAdmin(
    @Param('id') enterpriseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getEnterpriseUsers(enterpriseId, page, pageSize, search);
  }

  @Get('enterprises/:id/apps')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ operationId: 'getEnterpriseAppsBySuperAdmin', summary: '企业下应用列表（超级管理员）' })
  @ApiResponse({ status: 200, description: '应用列表' })
  getEnterpriseAppsBySuperAdmin(@Param('id') enterpriseId: string) {
    return this.adminService.getEnterpriseApps(enterpriseId);
  }

  // ==================== 企业管理员端点 ====================

  @Get('enterprise/activity')
  @Roles(Role.ENTERPRISE_ADMIN)
  @ApiOperation({ operationId: 'getEnterpriseActivity', summary: '本企业登录活动记录（企业管理员）' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiResponse({ status: 200, description: '活动记录列表' })
  getEnterpriseActivity(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    const user = req.user as any;
    return this.adminService.getEnterpriseActivity(user.enterpriseId, page, pageSize);
  }

  @Get('enterprise/users')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ operationId: 'getEnterpriseUsers', summary: '本企业用户列表（超级管理员）' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiResponse({ status: 200, description: '用户列表' })
  getMyEnterpriseUsers(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    const user = req.user as any;
    return this.adminService.getEnterpriseUsers(user.enterpriseId, page, pageSize, search);
  }

  @Post('enterprise/users')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ operationId: 'createEnterpriseUser', summary: '创建本企业用户（超级管理员）' })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 409, description: '该企业内用户名已存在' })
  createEnterpriseUser(
    @Req() req: Request,
    @Body() dto: AdminCreateUserDto,
  ) {
    const user = req.user as any;
    return this.adminService.createEnterpriseUser(user.enterpriseId, dto);
  }

  @Patch('enterprise/users/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ operationId: 'updateEnterpriseUser', summary: '更新用户（超级管理员）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateUser(
    @Param('id') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.adminService.updateUser(userId, dto);
  }

  @Delete('enterprise/users/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ operationId: 'deleteEnterpriseUser', summary: '删除用户（超级管理员，软删除）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  removeUser(@Param('id') userId: string) {
    return this.adminService.removeUser(userId);
  }

  @Get('enterprise/apps')
  @Roles(Role.ENTERPRISE_ADMIN)
  @ApiOperation({ operationId: 'getEnterpriseApps', summary: '本企业应用列表（企业管理员）' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiResponse({ status: 200, description: '应用列表' })
  getMyEnterpriseApps(
    @Req() req: Request,
    @Query('search') search?: string,
  ) {
    const user = req.user as any;
    return this.adminService.getEnterpriseApps(user.enterpriseId, search);
  }

  @Post('enterprise/apps')
  @Roles(Role.ENTERPRISE_ADMIN)
  @ApiOperation({ operationId: 'createEnterpriseApp', summary: '创建本企业应用（企业管理员）' })
  @ApiResponse({ status: 201, description: '应用创建成功' })
  createEnterpriseApp(
    @Req() req: Request,
    @Body() dto: CreateAppDto,
  ) {
    const user = req.user as any;
    return this.adminService.createEnterpriseApp(user.enterpriseId, dto);
  }

  @Delete('enterprise/apps/:appId')
  @Roles(Role.ENTERPRISE_ADMIN)
  @ApiOperation({ operationId: 'deleteEnterpriseApp', summary: '删除应用（企业管理员）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  removeApp(@Param('appId') appId: string) {
    return this.adminService.removeApp(appId);
  }

  @Patch('enterprise/apps/:appId')
  @Roles(Role.ENTERPRISE_ADMIN)
  @ApiOperation({ operationId: 'updateEnterpriseApp', summary: '更新应用（企业管理员）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateEnterpriseApp(
    @Param('appId') appId: string,
    @Body() dto: UpdateAppDto,
  ) {
    return this.adminService.updateEnterpriseApp(appId, dto);
  }
}