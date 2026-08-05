import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { KeyService } from './key.service';

/**
 * JWKS（JSON Web Key Set）公开端点：
 * SP 运行时通过此端点自动获取所有应用的 RSA 公钥，
 * 用于本地 JWT 验签，无需手动传递密钥。
 *
 * 符合 RFC 7517 规范，jose 等库可通过 createRemoteJWKSet() 自动消费。
 */
@ApiTags('jwks')
@Controller('.well-known')
export class JwksController {
  constructor(private readonly keyService: KeyService) {}

  @Public()
  @Get('jwks.json')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'JWKS 端点：返回所有应用 RSA-2048 公钥（RS256）' })
  @ApiResponse({
    status: 200,
    description: 'JWKS 公钥集合，每个 key 含 kid/alg/kty/n/e',
  })
  async getJwks() {
    return this.keyService.getJwks();
  }
}
