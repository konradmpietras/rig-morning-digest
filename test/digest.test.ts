import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('aggregates the 2026-10-28 run log and counts its malformed line', () => {
    const digest = readNight('runs', '2026-10-28');

    expect(digest.rows).toHaveLength(5);
    expect(digest.malformedLines).toBe(1);
    expect(digest.rows.map(({ job }) => job)).toEqual([
      'rig/rotate-logs',
      'lane/sync',
      'fixtures/refresh',
      'notes/backup',
      'digest/render',
    ]);
  });

  it('tracks run counts, retry counts, final status and timestamps', () => {
    const { rows } = readNight('runs', '2026-10-28');
    const sync = rows.find(({ job }) => job === 'lane/sync');
    const refresh = rows.find(({ job }) => job === 'fixtures/refresh');

    expect(sync).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
    expect(refresh).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('retains a null owner and the last failure details', () => {
    const { rows } = readNight('runs', '2026-10-28');

    expect(rows.find(({ job }) => job === 'digest/render')?.owner).toBeNull();
    expect(rows.find(({ job }) => job === 'notes/backup')).toMatchObject({
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
  });
});
