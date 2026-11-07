import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
const night = '2026-10-28';
const runsDirs: string[] = [];

function makeRunsDir(content: string): string {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-api-'));
  runsDirs.push(runsDir);
  writeFileSync(join(runsDir, `${night}.jsonl`), content);
  return runsDir;
}

afterEach(() => {
  for (const runsDir of runsDirs.splice(0)) rmSync(runsDir, { recursive: true, force: true });
});

describe('digest JSON API', () => {
  it('returns the page rows in job order and counts malformed lines', async () => {
    const runsDir = makeRunsDir(
      [
        JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'zeta', status: 'ok', owner: null }),
        'not json',
        JSON.stringify({ at: '2026-10-28T02:00:00+01:00', job: 'alpha', status: 'fail', owner: 'rook', error: 'failed' }),
      ].join('\n'),
    );
    const app = createApp({ ...config, runsDir });

    const apiResponse = await app.request(`/api/digest/${night}`);
    const pageResponse = await app.request(`/digest/${night}`);
    const apiDigest = await apiResponse.json();
    const page = await pageResponse.text();

    expect(apiResponse.status).toBe(200);
    expect(apiDigest).toMatchObject({
      malformedLines: 1,
      rows: [{ job: 'alpha' }, { job: 'zeta' }],
    });
    expect(pageResponse.status).toBe(200);
    expect(page.indexOf('<td>alpha</td>')).toBeLessThan(page.indexOf('<td>zeta</td>'));
  });

  it('returns an empty digest for an empty night', async () => {
    const runsDir = makeRunsDir('');
    const response = await createApp({ ...config, runsDir }).request(`/api/digest/${night}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rows: [], malformedLines: 0 });
  });

  it('returns 404 when the night file does not exist', async () => {
    const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-api-'));
    runsDirs.push(runsDir);
    const response = await createApp({ ...config, runsDir }).request(`/api/digest/${night}`);

    expect(response.status).toBe(404);
  });
});
