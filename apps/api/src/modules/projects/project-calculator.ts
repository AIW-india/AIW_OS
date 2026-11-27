import { Decimal } from 'decimal.js';

export interface MilestoneProgressItem {
  status: string;
  progressPercentage?: number | string | Decimal | null;
}

export interface TaskProgressItem {
  status: string;
}

/**
 * Calculates project progress percentage based on:
 * 1. Milestone progress (if milestones exist)
 * 2. Task completion (if tasks exist without milestones)
 * 3. 0 if no milestones/tasks yet
 */
export function calculateProjectProgress(
  milestones: MilestoneProgressItem[],
  tasks: TaskProgressItem[],
): Decimal {
  if (milestones && milestones.length > 0) {
    let sum = new Decimal(0);
    for (const m of milestones) {
      if (m.status === 'COMPLETED') {
        sum = sum.plus(100);
      } else {
        const pct = new Decimal(m.progressPercentage ?? 0);
        sum = sum.plus(Decimal.min(100, Decimal.max(0, pct)));
      }
    }
    return sum.div(milestones.length).toDecimalPlaces(2);
  }

  if (tasks && tasks.length > 0) {
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    return new Decimal(completed).div(tasks.length).mul(100).toDecimalPlaces(2);
  }

  return new Decimal(0);
}

/**
 * Calculates milestone progress percentage based on its tasks.
 */
export function calculateMilestoneProgress(tasks: TaskProgressItem[]): Decimal {
  if (!tasks || tasks.length === 0) return new Decimal(0);
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  return new Decimal(completed).div(tasks.length).mul(100).toDecimalPlaces(2);
}
