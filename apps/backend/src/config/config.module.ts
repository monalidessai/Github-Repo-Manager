import { Module, Global } from '@nestjs/common';
import { AppConfigService } from './config.service';
import { ConfigController } from './config.controller';

@Global()
@Module({
  providers: [AppConfigService],
  controllers: [ConfigController],
  exports: [AppConfigService],
})
export class AppConfigModule {}
