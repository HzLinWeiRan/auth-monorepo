import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwksController } from './jwks.controller';
import { OAuthController } from './oauth.controller';
import { TokenController } from './token.controller';
import { DiscoveryController } from './discovery.controller';
import { SessionService } from './session.service';
import { KeyService } from './key.service';
import { AuthorizationCodeService } from './authorization-code.service';
import { RefreshTokenService } from './refresh-token.service';
import { Session } from './session.entity';
import { AuthorizationCode } from './authorization-code.entity';
import { RefreshToken } from './refresh-token.entity';
import { LoginActivity } from './login-activity.entity';
import { Enterprise } from '../enterprise/enterprise.entity';
import { App } from '../app/app.entity';
import { UserModule } from '../user/user.module';
import { EnterpriseModule } from '../enterprise/enterprise.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      AuthorizationCode,
      RefreshToken,
      LoginActivity,
      Enterprise,
      App,
    ]),
    UserModule,
    EnterpriseModule,
  ],
  controllers: [
    AuthController,
    JwksController,
    OAuthController,
    TokenController,
    DiscoveryController,
  ],
  providers: [
    AuthService,
    SessionService,
    KeyService,
    AuthorizationCodeService,
    RefreshTokenService,
  ],
  exports: [
    AuthService,
    KeyService,
    AuthorizationCodeService,
    RefreshTokenService,
  ],
})
export class AuthModule {}
