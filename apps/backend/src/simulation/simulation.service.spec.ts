import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let service: SimulationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimulationService],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  it('1 & 2: Simulation offset initially equals 0 and getEffectiveNow() matches real date', () => {
    expect(service.getOffsetDays()).toBe(0);
    const realTime = new Date().getTime();
    const effectiveTime = service.getEffectiveNow().getTime();
    expect(Math.abs(effectiveTime - realTime)).toBeLessThan(1000);
  });

  it('3: +5 days advances effectiveNow by exactly 5 days', () => {
    service.advanceTime(5);
    expect(service.getOffsetDays()).toBe(5);

    const expectedTime = Date.now() + 5 * 86400000;
    const effectiveTime = service.getEffectiveNow().getTime();
    expect(Math.abs(effectiveTime - expectedTime)).toBeLessThan(1000);
  });

  it('4: +10 days cumulative advances effectiveNow by 15 days total', () => {
    service.advanceTime(5);
    service.advanceTime(10);
    expect(service.getOffsetDays()).toBe(15);

    const expectedTime = Date.now() + 15 * 86400000;
    const effectiveTime = service.getEffectiveNow().getTime();
    expect(Math.abs(effectiveTime - expectedTime)).toBeLessThan(1000);
  });

  it('10: Reset returns offset to 0 and restores effectiveNow to real time', () => {
    service.advanceTime(30);
    expect(service.getOffsetDays()).toBe(30);

    service.resetSimulation();
    expect(service.getOffsetDays()).toBe(0);

    const realTime = new Date().getTime();
    const effectiveTime = service.getEffectiveNow().getTime();
    expect(Math.abs(effectiveTime - realTime)).toBeLessThan(1000);
  });

  it('17: Simulation does not modify actual system time Date.now()', () => {
    const beforeDate = Date.now();
    service.advanceTime(90);
    const afterDate = Date.now();

    expect(Math.abs(afterDate - beforeDate)).toBeLessThan(1000);
  });
});
