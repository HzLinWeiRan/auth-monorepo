import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { CreateAppDto } from './dto/create-app.dto';
import { success } from '../../common/dto/response.dto';

/**
 * SP 应用管理接口（需登录后访问）：
 * 注册应用后获得 appId/secret 与 RSA 密钥对，SP 凭此对接 SSO。
 * 私钥仅在创建时返回一次，公钥通过 JWKS 端点持续对外暴露。
 */
@ApiTags('apps')
@ApiBearerAuth('access-token')
@Controller('apps')
export class AppController {
  constructor(private readonly apps: AppService) {}

  @Post()
  @ApiOperation({ summary: '注册 SP 应用，生成 appId、secret 与 RSA-2048 密钥对（私钥仅此一次返回）' })
  @ApiResponse({ status: 201, description: '注册成功，返回含 secret、publicKey、privateKey、kid 的完整应用信息' })
  @ApiResponse({ status: 401, description: '未登录' })
  async create(@Body() dto: CreateAppDto) {
    const app = await this.apps.create(dto);
    return success(app, '应用注册成功', 201);
  }

  @Get()
  @ApiOperation({ summary: '查询已注册的应用列表（不含 secret 和 privateKey，含 publicKey）' })
  @ApiResponse({ status: 200, description: '应用列表' })
  async list() {
    return success(await this.apps.findAll());
  }

  @Get(':appId')
  @ApiOperation({ summary: '按 appId 查询应用详情（不含 secret 和 privateKey，含 publicKey）' })
  @ApiParam({ name: 'appId', description: '应用标识', example: 'app_1a2b3c4d5e6f7a8b' })
  @ApiResponse({ status: 200, description: '应用详情' })
  @ApiResponse({ status: 404, description: '应用不存在' })
  async detail(@Param('appId') appId: string) {
    return success(await this.apps.findByAppId(appId));
  }

  @Delete(':appId')
  @HttpCode(200)
  @ApiOperation({ summary: '删除应用' })
  @ApiParam({ name: 'appId', description: '应用标识' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '应用不存在' })
  async remove(@Param('appId') appId: string) {
    await this.apps.remove(appId);
    return success(null, '应用已删除');
  }
}
