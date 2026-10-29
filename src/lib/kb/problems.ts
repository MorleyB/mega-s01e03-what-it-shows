// Splits a merged ticket into the problems its reports describe.
// causes.ts places a report by tenant and channel. A report the desk read as a one-day move
// (desk-notes.json) describes a different failure: the date shifts by one day, it does not flip.
// Those get their own problem instead of a footnote under the tenant's cause.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';

export function problemOf(r: Report, t: Tenant | undefined, shiftIds: readonly string[]): Problem {
  if (shiftIds.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemRow = {
  problem: Problem;
  reports: number;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  channels: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  ids: string[];
};

export type Split = { rows: number; unique: number; rowsByProblem: ProblemRow[] };

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): Split {
  const rows = all.filter((r) => r.mergedInto === ticket);
  const merged = uniqueById(rows);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), shiftIds);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const rowsByProblem = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs.length,
        taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
        channels: tally(rs.map((r) => r.channel)),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        ids: rs.map((r) => r.id).sort(),
      };
    })
    .sort((a, b) => b.reports - a.reports);
  return { rows: rows.length, unique: merged.length, rowsByProblem };
}
