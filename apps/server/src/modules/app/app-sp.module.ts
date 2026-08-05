import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { App } from './app.entity';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { AuthModule } from '../auth/auth.module';

/** SP 应用管理模块：依赖 AuthModule 获取 KeyService（密钥对生成） */
@Module({
  imports: [TypeOrmModule.forFeature([App]), AuthModule],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppSpModule {}
