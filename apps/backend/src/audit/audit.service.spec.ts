import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService Canonical Hash Chain & Tamper Detection', () => {
  let service: AuditService;

  const mockLogsStore: any[] = [];

  const mockPrisma = {
    auditLog: {
      findFirst: jest.fn().mockImplementation(() => {
        if (mockLogsStore.length === 0) return null;
        return mockLogsStore[mockLogsStore.length - 1];
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        mockLogsStore.push(data);
        return data;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let result = [...mockLogsStore];
        if (where?.actor?.contains) {
          result = result.filter((l) =>
            l.actor.toLowerCase().includes(where.actor.contains.toLowerCase()),
          );
        }
        return result;
      }),
      count: jest.fn().mockImplementation(() => mockLogsStore.length),
    },
  };

  beforeEach(async () => {
    mockLogsStore.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('Canonical JSON Serialization', () => {
    it('TEST 1: Two equivalent objects with different key ordering produce the same canonical representation', () => {
      const objA = { b: 2, a: 1 };
      const objB = { a: 1, b: 2 };
      expect(service.canonicalizeJson(objA)).toEqual(service.canonicalizeJson(objB));
      expect(service.canonicalizeJson(objA)).toBe('{"a":1,"b":2}');
    });

    it('TEST 2: Nested JSON objects are canonicalized deterministically', () => {
      const nestedA = { z: { y: 2, x: 1 }, m: 'test' };
      const nestedB = { m: 'test', z: { x: 1, y: 2 } };
      expect(service.canonicalizeJson(nestedA)).toEqual(service.canonicalizeJson(nestedB));
      expect(service.canonicalizeJson(nestedA)).toBe('{"m":"test","z":{"x":1,"y":2}}');
    });

    it('TEST 3: Array ordering is preserved during canonicalization', () => {
      const arrObj = { list: [3, 1, 2], name: 'demo' };
      expect(service.canonicalizeJson(arrObj)).toBe('{"list":[3,1,2],"name":"demo"}');
    });
  });

  describe('Hash Chain Creation and Verification', () => {
    it('TEST 4 & 5: Newly created audit records verify successfully in a hash chain', async () => {
      await service.log({
        actor: 'admin1',
        action: 'CREATE_REPO',
        repository: 'pt-python-test',
        ipAddress: '127.0.0.1',
        context: { role: 'developer', retention: 90 },
      });

      await service.log({
        actor: 'admin2',
        action: 'SET_OVERRIDE_DATE',
        repository: 'pt-python-test',
        ipAddress: '127.0.0.1',
        context: { customExpiryDate: '2026-09-01T00:00:00.000Z', customAction: 'delete' },
      });

      const verification = await service.verifyChain();
      expect(verification.isChainValid).toBe(true);
      expect(verification.totalChecked).toBe(2);
      expect(verification.tamperedRecordId).toBeNull();
    });

    it('TEST 6: Changing the action of an audit record causes verification to fail', async () => {
      await service.log({
        actor: 'admin1',
        action: 'DELETE_REPOSITORY',
        repository: 'pt-java-demo',
        ipAddress: '127.0.0.1',
      });

      // Tamper with action
      mockLogsStore[0].action = 'TAMPERED_ACTION';

      const verification = await service.verifyChain();
      expect(verification.isChainValid).toBe(false);
      expect(verification.tamperedRecordId).toBe(mockLogsStore[0].id);
    });

    it('TEST 7: Changing the repository causes verification to fail', async () => {
      await service.log({
        actor: 'admin1',
        action: 'ARCHIVE_REPOSITORY',
        repository: 'pt-java-demo',
        ipAddress: '127.0.0.1',
      });

      // Tamper with repository
      mockLogsStore[0].repository = 'pt-hacked-repo';

      const verification = await service.verifyChain();
      expect(verification.isChainValid).toBe(false);
      expect(verification.tamperedRecordId).toBe(mockLogsStore[0].id);
    });

    it('TEST 8: Changing the context value causes verification to fail', async () => {
      await service.log({
        actor: 'admin1',
        action: 'UPDATE_SETTINGS',
        repository: 'SYSTEM',
        ipAddress: '127.0.0.1',
        context: { retentionDays: 90 },
      });

      // Tamper with context
      mockLogsStore[0].context.retentionDays = 1;

      const verification = await service.verifyChain();
      expect(verification.isChainValid).toBe(false);
      expect(verification.tamperedRecordId).toBe(mockLogsStore[0].id);
    });

    it('TEST 9: Changing the previous hash causes verification to fail', async () => {
      await service.log({
        actor: 'admin1',
        action: 'LOGIN',
        repository: 'SYSTEM',
        ipAddress: '127.0.0.1',
      });

      await service.log({
        actor: 'admin1',
        action: 'LOGOUT',
        repository: 'SYSTEM',
        ipAddress: '127.0.0.1',
      });

      // Tamper with previous hash of second record
      mockLogsStore[1].previousHash = 'tampered_previous_hash_value';

      const verification = await service.verifyChain();
      expect(verification.isChainValid).toBe(false);
      expect(verification.tamperedRecordId).toBe(mockLogsStore[1].id);
    });

    it('TEST 10: Changing the stored SHA-256 hash causes verification to fail', async () => {
      await service.log({
        actor: 'admin1',
        action: 'LOGIN',
        repository: 'SYSTEM',
        ipAddress: '127.0.0.1',
      });

      // Tamper with stored hash
      mockLogsStore[0].hash = 'fake_sha256_hash_value';

      const verification = await service.verifyChain();
      expect(verification.isChainValid).toBe(false);
      expect(verification.tamperedRecordId).toBe(mockLogsStore[0].id);
    });

    it('TEST 12: Audit export continues to work', async () => {
      await service.log({
        actor: 'admin1',
        action: 'USER_LOGIN',
        repository: 'SYSTEM',
        ipAddress: '127.0.0.1',
        context: { customAction: 'delete', customExpiryDate: '2026-08-09T00:00:00.000Z' },
      });

      const csv = await service.exportCsv({});
      expect(csv).toContain('admin1');
      expect(csv).toContain('USER_LOGIN');
      expect(csv).toContain('customAction');
      expect(csv).toContain('delete');
    });
  });
});
