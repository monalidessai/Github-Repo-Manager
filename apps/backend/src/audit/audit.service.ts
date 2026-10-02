import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { Parser } from 'json2csv';
import * as crypto from 'crypto';

export interface CreateAuditLogParams {
  actor: string;
  action: string;
  repository: string;
  ipAddress: string;
  context?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  canonicalizeJson(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalizeJson(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const keyValues = keys.map((key) => `${JSON.stringify(key)}:${this.canonicalizeJson(obj[key])}`);
    return '{' + keyValues.join(',') + '}';
  }

  private calculateHash(
    id: string,
    timestamp: Date,
    actor: string,
    action: string,
    repository: string,
    ipAddress: string,
    context: any,
    previousHash: string | null,
  ): string {
    const canonicalContext = this.canonicalizeJson(context || {});
    const data = `${previousHash || 'GENESIS_NODE'}|${id}|${timestamp.toISOString()}|${actor}|${action}|${repository}|${ipAddress}|${canonicalContext}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async log(params: CreateAuditLogParams) {
    this.logger.log(`Audit log created: ${params.actor} -> ${params.action} on ${params.repository}`);

    // Get the latest log entry to fetch its hash for the hash chain
    const latestLog = await this.prisma.auditLog.findFirst({
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    });

    const previousHash = latestLog ? latestLog.hash : null;
    const id = crypto.randomUUID();
    const timestamp = new Date();
    const hash = this.calculateHash(
      id,
      timestamp,
      params.actor,
      params.action,
      params.repository,
      params.ipAddress,
      params.context,
      previousHash,
    );

    return this.prisma.auditLog.create({
      data: {
        id,
        actor: params.actor,
        action: params.action,
        repository: params.repository,
        timestamp,
        ipAddress: params.ipAddress,
        context: params.context || {},
        previousHash,
        hash,
      },
    });
  }

  async getLogs(query: QueryAuditDto) {
    const { actor, action, repository, startDate, endDate, page = 1, limit = 20 } = query;

    const where: any = {};

    if (actor) {
      where.actor = { contains: actor, mode: 'insensitive' };
    }
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (repository) {
      where.repository = { contains: repository, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async verifyChain(): Promise<{ isChainValid: boolean; totalChecked: number; tamperedRecordId: string | null }> {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });

    let previousHash: string | null = null;

    for (const log of logs) {
      if (log.previousHash !== previousHash) {
        this.logger.warn(`Audit chain mismatch at log ID ${log.id}: expected prevHash ${previousHash}, got ${log.previousHash}`);
        return { isChainValid: false, totalChecked: logs.length, tamperedRecordId: log.id };
      }

      const recomputedHash = this.calculateHash(
        log.id,
        log.timestamp,
        log.actor,
        log.action,
        log.repository,
        log.ipAddress,
        log.context,
        previousHash,
      );

      if (recomputedHash !== log.hash) {
        this.logger.warn(`Audit hash tamper detected at log ID ${log.id}`);
        return { isChainValid: false, totalChecked: logs.length, tamperedRecordId: log.id };
      }

      previousHash = log.hash;
    }

    return { isChainValid: true, totalChecked: logs.length, tamperedRecordId: null };
  }

  async exportCsv(query: QueryAuditDto): Promise<string> {
    const { logs } = await this.getLogs({ ...query, page: 1, limit: 10000 });

    const formatted = logs.map((log) => ({
      ID: log.id,
      Actor: log.actor,
      Action: log.action,
      Repository: log.repository,
      Timestamp_UTC: log.timestamp.toISOString(),
      IP_Address: log.ipAddress,
      Previous_Hash: log.previousHash || 'GENESIS',
      Hash: log.hash,
      Context: this.canonicalizeJson(log.context),
    }));

    const json2csvParser = new Parser();
    return json2csvParser.parse(formatted);
  }
}
