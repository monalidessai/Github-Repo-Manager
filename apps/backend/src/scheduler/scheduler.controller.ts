import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SessionGuard } from '../common/guards/session.guard';
import { SimulationService } from '../simulation/simulation.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserSession } from '@repo-manager/shared';
import { ConfigService } from '@nestjs/config';

@Controller('scheduler')
@UseGuards(SessionGuard)
export class SchedulerController {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly simulationService: SimulationService,
    private readonly nestConfig: ConfigService,
  ) {}

  private isSimulationEnabled(): boolean {
    return (
      this.nestConfig.get<string>('SIMULATION_ENABLED') === 'true' ||
      process.env.SIMULATION_ENABLED === 'true'
    );
  }

  @Post('trigger')
  async triggerRetentionCheck(@CurrentUser() user: UserSession) {
    const result = await this.schedulerService.runRetentionCheck(user.accessToken);
    return {
      success: true,
      message: 'Scheduled retention check triggered manually',
      data: result,
    };
  }

  @Get('simulation')
  async getSimulationState() {
    return {
      success: true,
      data: {
        ...this.simulationService.getSimulationState(),
        simulationEnabled: this.isSimulationEnabled(),
      },
    };
  }

  @Post('simulation/advance')
  async advanceSimulation(
    @CurrentUser() user: UserSession,
    @Body('days') days: number,
  ) {
    if (!this.isSimulationEnabled()) {
      throw new ForbiddenException(
        'Simulation tools are disabled by environment configuration (SIMULATION_ENABLED=false).',
      );
    }

    if (typeof days !== 'number' || days <= 0) {
      throw new BadRequestException('Days must be a positive number');
    }

    this.simulationService.advanceTime(days);
    const retentionResult = await this.schedulerService.runRetentionCheck(user.accessToken);

    return {
      success: true,
      message: `Simulated time advanced by ${days} day(s)`,
      data: {
        simulationState: this.simulationService.getSimulationState(),
        retentionResult,
      },
    };
  }

  @Post('simulation/reset')
  async resetSimulation() {
    if (!this.isSimulationEnabled()) {
      throw new ForbiddenException(
        'Simulation tools are disabled by environment configuration (SIMULATION_ENABLED=false).',
      );
    }

    this.simulationService.resetSimulation();
    return {
      success: true,
      message: 'Simulation time reset to real current time',
      data: this.simulationService.getSimulationState(),
    };
  }
}
