import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TokenRequestDto } from './dto/oauth/token-request.dto';
import { TokenResponseDto } from './dto/oauth/token-response.dto';
import { IntrospectionRequestDto } from './dto/oauth/introspection-request.dto';
import { IntrospectionResponseDto } from './dto/oauth/introspection-response.dto';
import { RevocationRequestDto } from './dto/oauth/revocation-request.dto';
import { UserInfoResponseDto } from './dto/oauth/userinfo-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import * as rawJwt from 'jsonwebtoken';

/**
 * OAuth 2.0 / OIDC API 端点（挂 /api/v1 前缀）：
 *  - POST /oauth/token       Token 端点（authorization_code / refresh_token）
 *  - POST /oauth/introspect  Token Introspection（RFC 7662）
 *  - POST /oauth/revoke      Token Revocation（RFC 7009）
 *  - GET  /oauth/userinfo    OIDC UserInfo 端点
 */
@ApiTags('oauth')
@Controller('oauth')
export class TokenController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
  ) {}

  @Public()
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth 2.0 Token 端点（authorization_code / refresh_token）' })
  @ApiResponse({
    status: 200,
    description: '换发成功，返回 access_token、refresh_token、id_token、scope',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: '客户端认证失败 / 授权码无效 / 刷新令牌无效' })
  async token(@Body() dto: TokenRequestDto) {
    if (dto.grant_type === 'authorization_code') {
      return this.auth.exchangeAuthorizationCode(dto);
    }
    if (dto.grant_type === 'refresh_token') {
      return this.auth.oauthRefresh(dto);
    }
    throw new UnauthorizedException('不支持的 grant_type');
  }

  @Public()
  @Post('introspect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Token Introspection（RFC 7662）' })
  @ApiResponse({
    status: 200,
    description: '返回 Token 的 active 状态及元信息',
    type: IntrospectionResponseDto,
  })
  async introspect(@Body() dto: IntrospectionRequestDto) {
    return this.auth.introspect(dto.token);
  }

  @Public()
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Token Revocation（RFC 7009）' })
  @ApiResponse({ status: 200, description: '吊销成功（无论 Token 是否存在均返回 200）' })
  async revoke(@Body() dto: RevocationRequestDto) {
    await this.auth.revoke(dto.token, dto.client_id);
    return { ok: true };
  }

  @ApiBearerAuth('access-token')
  @Get('userinfo')
  @ApiOperation({ summary: 'OIDC UserInfo 端点' })
  @ApiResponse({
    status: 200,
    description: '返回当前用户 claims（按 scope）',
    type: UserInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: '未携带或令牌无效' })
  async userinfo(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('缺少 Authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = rawJwt.decode(token) as { scope?: string } | null;
    const scopes = (decoded?.scope || 'openid').split(' ').filter(Boolean);

    const fullUser = await this.users.findById(user.id);
    return this.auth.buildUserInfo(fullUser, scopes);
  }
}