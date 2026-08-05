import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Enterprise } from '../modules/enterprise/enterprise.entity';
import { User } from '../modules/user/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Enterprise, User])],
  providers: [SeedService],
})
export class SeedModule {}