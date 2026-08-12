import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppSpModule } from './modules/app/app-sp.module';
import { DemoSpModule } from './modules/demo-sp/demo-sp.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';
import { AdminModule } from './modules/admin/admin.module';
import { SeedModule } from './seeds/seed.module';
import { User } from './modules/user/user.entity';
import { App } from './modules/app/app.entity';
import { Session } from './modules/auth/session.entity';
import { AuthorizationCode } from './modules/auth/authorization-code.entity';
import { RefreshToken } from './modules/auth/refresh-token.entity';
import { LoginActivity } from './modules/auth/login-activity.entity';
import { Enterprise } from './modules/enterprise/enterprise.entity';

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [configuration],
    }),
    // 数据库（默认 SQLite，可在 .env 切换 postgres/mysql）
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: (config.get('database.type') || 'better-sqlite3') as
          'better-sqlite3' | 'postgres' | 'mysql',
        database: config.get<string>('database.database') || './sso.sqlite',
        autoLoadEntities: true,
        synchronize: true,
        entities: [
          User,
          App,
          Session,
          AuthorizationCode,
          RefreshToken,
          LoginActivity,
          Enterprise,
        ],
      }),
    }),
    // JWT 基础设施（全局）
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.secret');
        if (!secret) {
          throw new Error('jwt.secret 未配置');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('jwt.accessExpiresIn') ||
              '15m') as never,
          },
        };
      },
    }),
    // 全局限流（防爆破 / 防刷）
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60, // 60 秒窗口
          limit: 100, // 单 IP 最多 100 次请求
        },
      ],
    }),
    // 功能模块
    UserModule,
    AuthModule,
    AppSpModule,
    DemoSpModule,
    EnterpriseModule,
    AdminModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [
    // JWT 校验策略（供 JwtAuthGuard 使用）
    JwtStrategy,
    // 以 APP_GUARD 注册，确保全局生效
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
