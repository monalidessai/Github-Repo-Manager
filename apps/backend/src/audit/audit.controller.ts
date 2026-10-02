import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { SessionGuard } from '../common/guards/session.guard';
import { Response } from 'express';

@Controller('audit')
@UseGuards(SessionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(@Query() query: QueryAuditDto) {
    return this.auditService.getLogs(query);
  }

  @Get('verify')
  async verifyChain() {
    return this.auditService.verifyChain();
  }

  @Get('export')
  async exportCsv(@Query() query: QueryAuditDto, @Res() res: Response) {
    const csv = await this.auditService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    return res.send(csv);
  }
}
