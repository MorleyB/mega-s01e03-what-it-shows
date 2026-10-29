// Splits a merged ticket into the problems its reports describe, counted the desk's way.
// Causes come from causes.ts (groupByCause), exactly as CauseTable counts them. Reports the desk
// read as a one-day move (desk-notes.json) describe a different failure: the date shifts by one
// day, it does not flip. They get a problem row of their own, but stay counted where the desk
// files them (under their tenant's cause), as readAs does.
import { groupByCause, readAs, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';

export type ProblemRow = {
  problem: Problem;
  reports: number;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  ids: string[];
  // For `shift`: the cause these reports are counted under.
  filedUnder: Problem[];
};

export type Split = { rows: number; unique: number; rowsByProblem: ProblemRow[] };

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

function row(problem: Problem, rs: Report[], filedUnder: Problem[] = []): ProblemRow {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs.length,
    taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
    tenants: new Set(rs.map((r) => r.tenant)).size,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    ids: rs.map((r) => r.id).sort(),
    filedUnder,
  };
}

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): Split {
  const rows = all.filter((r) => r.mergedInto === ticket);
  const merged = uniqueById(rows);
  const groups = groupByCause(merged, tenantOf);
  const byCause = groups.map((g) => row(g.cause, g.reports));
  const shifted = merged.filter((r) => shiftIds.includes(r.id));
  const filedUnder = groups.filter((g) => readAs(g, shiftIds) > 0).map((g) => g.cause);
  const rowsByProblem = shifted.length ? [...byCause, row('shift', shifted, filedUnder)] : byCause;
  return { rows: rows.length, unique: merged.length, rowsByProblem };
}
