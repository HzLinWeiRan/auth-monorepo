import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { EnterpriseModule } from '../enterprise/enterprise.module';
import { AppSpModule } from '../app/app-sp.module';

@Module({
  imports: [AuthModule, UserModule, EnterpriseModule, AppSpModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}