<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { splitTicket, type Problem } from '#lib/kb/problems';
  import { tenantOf } from '#lib/kb/locales';
  import type { Report } from '#lib/kb/causes';

  // issues: problem → issue URL, where each problem is tracked now.
  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, string>> } = $props();

  const LABEL: Record<Problem, string> = {
    parser: 'month and day flipped: the shared parser reads day-first dates month first',
    hint: 'month and day flipped: booking-v3 form hint says MM/DD, the form reads the tenant’s DD/MM',
    shift: 'date moved by one day, not flipped',
    unplaced: 'no tenant on file: cannot place',
  };

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const issueNo = (url: string) => url.replace(/^.*\/issues\//, '#');
</script>

<p class="sum">
  <strong>{split.unique}</strong> reports merged into #{ticket}
  ({split.rows} rows in the export; {split.rows - split.unique} are repeats of the same id) ·
  <strong>{split.rowsByProblem.length}</strong> problems
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>channels</th><th>intake tagged as</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.rowsByProblem as p (p.problem)}
      <tr>
        <td><code>{p.problem}</code><br /><small>{LABEL[p.problem]}</small></td>
        <td><strong>{p.reports}</strong></td>
        <td class="tags">{list(p.channels)}</td>
        <td class="tags">{list(p.taggedAs)}</td>
        <td>{p.tenants}</td>
        <td class="tags">{p.firstSeen} → {p.lastSeen}</td>
        <td>{#if issues[p.problem]}<a href={issues[p.problem]}>{issueNo(issues[p.problem]!)}</a>{:else}—{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#each split.rowsByProblem.filter((p) => p.reports <= 10) as p (p.problem)}
  <p class="note"><code>{p.problem}</code> reports: {p.ids.join(', ')}</p>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
  small { color: var(--muted); }
  .note { color: var(--muted); font-size: 0.85em; }
</style>
