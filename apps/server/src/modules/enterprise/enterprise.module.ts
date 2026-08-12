import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enterprise } from './enterprise.entity';
import { EnterpriseService } from './enterprise.service';
import { EnterpriseController } from './enterprise.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Enterprise])],
  controllers: [EnterpriseController],
  providers: [EnterpriseService],
  exports: [EnterpriseService],
})
export class EnterpriseModule {}
