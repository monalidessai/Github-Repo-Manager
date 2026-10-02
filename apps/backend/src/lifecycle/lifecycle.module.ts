import { Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { LifecycleController } from './lifecycle.controller';

@Module({
  providers: [LifecycleService],
  controllers: [LifecycleController],
})
export class LifecycleModule {}
