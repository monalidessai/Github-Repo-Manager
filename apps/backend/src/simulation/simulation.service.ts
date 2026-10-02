import { Injectable } from '@nestjs/common';
import { SimulationStateDto } from '@repo-manager/shared';

@Injectable()
export class SimulationService {
  private offsetDays = 0;

  getEffectiveNow(): Date {
    if (this.offsetDays === 0) {
      return new Date();
    }
    return new Date(Date.now() + this.offsetDays * 86400000);
  }

  getOffsetDays(): number {
    return this.offsetDays;
  }

  advanceTime(days: number): number {
    if (days > 0) {
      this.offsetDays += days;
    }
    return this.offsetDays;
  }

  resetSimulation(): number {
    this.offsetDays = 0;
    return this.offsetDays;
  }

  getSimulationState(): SimulationStateDto {
    const realNow = new Date();
    const effectiveNow = this.getEffectiveNow();
    return {
      offsetDays: this.offsetDays,
      realDate: realNow.toISOString(),
      effectiveDate: effectiveNow.toISOString(),
      isSimulated: this.offsetDays > 0,
    };
  }
}
