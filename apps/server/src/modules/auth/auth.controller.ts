import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { success } from '../../common/dto/response.dto';
import { LoginDto } from '../user/dto/login.dto';
import { ValidateDto } from './dto/validate.dto';
import { SessionPingDto } from './dto/session-ping.dto';

/**
 * 认证 API 控制器（挂载于 /api/v1 前缀下）：
 *  - POST /auth/login        账号密码登录，返回 Token 与全局会话标识
 *  - POST /auth/validate     校验 Token 有效性（依据全局会话），供 SP 二次免登录判断
 *  - POST /auth/session/ping 轻量会话探活（供 SP 定时调用）
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: 'authLogin', summary: '账号密码登录，签发双 Token 并建立全局会话' })
  @ApiResponse({ status: 201, description: '登录成功，返回 Token 与全局会话标识' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto);
    return success(result, '登录成功', 201);
  }

  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'authValidate', summary: '校验 Token 有效性（依据全局会话），供 SP 二次免登录判断' })
  @ApiResponse({ status: 200, description: '返回 valid 与用户信息' })
  async validate(@Body() dto: ValidateDto) {
    const result = await this.auth.validateToken(dto);
    return success(result);
  }

  @Public()
  @Post('session/ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'authSessionPing', summary: '轻量会话探活：仅判断全局会话是否有效（供 SP 定时调用）' })
  @ApiResponse({ status: 200, description: '返回 alive 状态' })
  async pingSession(@Body() dto: SessionPingDto) {
    const result = await this.auth.pingSession(dto.sessionId);
    return success(result);
  }
}