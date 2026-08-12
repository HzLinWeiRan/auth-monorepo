import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AppSpModule } from '../app/app-sp.module';
import { UserModule } from '../user/user.module';
import { App } from '../app/app.entity';
import { DemoSpController } from './demo-sp.controller';

/**
 * 内置演示业务系统（SP）模块：
 * 依赖 AuthModule（换票 / 校验 / SLO）、AppSpModule（自动注册演示应用）、
 * UserModule（自动注册演示账号，使 /sp 演示开箱即用）。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([App]),
    AuthModule,
    AppSpModule,
    UserModule,
  ],
  controllers: [DemoSpController],
})
export class DemoSpModule {}
