import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserSession, BadgeStatus } from '@repo-manager/shared';

@Controller('dashboard')
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('repos')
  async getRepos(
    @CurrentUser() user: UserSession,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: BadgeStatus,
    @Query('accessStatus') accessStatus?: string,
    @Query('repoStatus') repoStatus?: string,
    @Query('sortBy') sortBy?: 'name' | 'createdAt' | 'daysRemaining',
    @Query('order') order?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getDashboardRepositories(user, {
      search,
      role,
      status,
      accessStatus,
      repoStatus,
      sortBy,
      order,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('repos/:repo')
  async getRepoByName(
    @CurrentUser() user: UserSession,
    @Param('repo') repoName: string,
  ) {
    return this.dashboardService.getRepoByName(user, repoName);
  }
}
