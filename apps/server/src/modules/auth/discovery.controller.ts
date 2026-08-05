import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { KeyService } from './key.service';

/**
 * OIDC Discovery 端点（RFC 8414 / OpenID Connect Discovery 1.0）。
 * SP 可通过此端点自动发现所有 OAuth 2.0 / OIDC 端点地址及能力。
 */
@ApiTags('oidc')
@Controller('.well-known')
export class DiscoveryController {
  constructor(
    private readonly config: ConfigService,
    private readonly keyService: KeyService,
  ) {}

  @Public()
  @Get('openid-configuration')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'OIDC Discovery 端点（RFC 8414）' })
  @ApiResponse({
    status: 200,
    description: '返回 OpenID Provider 配置元数据',
  })
  async getConfiguration() {
    const issuer = this.config.get<string>('issuer') || 'http://localhost:3000';

    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      userinfo_endpoint: `${issuer}/oauth/userinfo`,
      end_session_endpoint: `${issuer}/oauth/endsession`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      introspection_endpoint: `${issuer}/oauth/introspect`,
      revocation_endpoint: `${issuer}/oauth/revoke`,

      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256', 'HS256'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
      code_challenge_methods_supported: ['S256', 'plain'],
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'auth_time',
        'nonce',
        'at_hash',
        'name',
        'preferred_username',
        'email',
        'email_verified',
      ],
    };
  }
}