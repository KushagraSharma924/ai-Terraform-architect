import { Injectable } from '@nestjs/common';
import { CostPoint } from '../ports/telemetry.port';

export interface CostDriver {
  service: string;
  current: number;
  previous: number;
  deltaPct: number;
}

export interface CostTrend {
  totalCurrent: number;
  totalPrevious: number;
  deltaPct: number;
  drivers: CostDriver[];
  daily: { date: string; amount: number }[];
}

/**
 * Splits a cost series into two halves (previous vs current window) and ranks
 * the services driving the change — the data behind "why is my bill increasing?".
 */
@Injectable()
export class CostAnalysisEngine {
  analyze(points: CostPoint[]): CostTrend {
    const dates = [...new Set(points.map((p) => p.usageDate))].sort();
    const mid = Math.floor(dates.length / 2);
    const prevDates = new Set(dates.slice(0, mid));
    const currDates = new Set(dates.slice(mid));

    const byServicePrev: Record<string, number> = {};
    const byServiceCurr: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const p of points) {
      byDay[p.usageDate] = (byDay[p.usageDate] ?? 0) + p.amount;
      if (prevDates.has(p.usageDate)) byServicePrev[p.service] = (byServicePrev[p.service] ?? 0) + p.amount;
      if (currDates.has(p.usageDate)) byServiceCurr[p.service] = (byServiceCurr[p.service] ?? 0) + p.amount;
    }

    const services = new Set([...Object.keys(byServicePrev), ...Object.keys(byServiceCurr)]);
    const drivers: CostDriver[] = [...services]
      .map((service) => {
        const previous = round(byServicePrev[service] ?? 0);
        const current = round(byServiceCurr[service] ?? 0);
        const deltaPct = previous === 0 ? (current > 0 ? 100 : 0) : round(((current - previous) / previous) * 100);
        return { service, current, previous, deltaPct };
      })
      .sort((a, b) => b.current - b.previous - (a.current - a.previous));

    const totalCurrent = round(sum(Object.values(byServiceCurr)));
    const totalPrevious = round(sum(Object.values(byServicePrev)));
    const deltaPct = totalPrevious === 0 ? 0 : round(((totalCurrent - totalPrevious) / totalPrevious) * 100);

    return {
      totalCurrent,
      totalPrevious,
      deltaPct,
      drivers,
      daily: Object.entries(byDay).map(([date, amount]) => ({ date, amount: round(amount) })),
    };
  }
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const round = (n: number) => Math.round(n * 100) / 100;
