import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigModule } from './config/config.module';
import { AuditModule } from './audit/audit.module';
import { GitHubModule } from './github/github.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AccessModule } from './access/access.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { NotificationModule } from './notifications/notification.module';
import { SimulationModule } from './simulation/simulation.module';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AppConfigModule,
    AuditModule,
    GitHubModule,
    AuthModule,
    DashboardModule,
    AccessModule,
    LifecycleModule,
    SchedulerModule,
    NotificationModule,
    SimulationModule,
  ],
})
export class AppModule {}
