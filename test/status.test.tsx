import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach } from 'vitest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
let runsDir: string;

afterEach(() => {
  if (runsDir) rmSync(runsDir, { recursive: true, force: true });
  runsDir = '';
  delete process.env.LANE_MARKER;
});

function makeApp() {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-status-'));
  writeFileSync(
    join(runsDir, '2026-10-27.jsonl'),
    [
      JSON.stringify({ at: '2026-10-27T01:00:00+01:00', job: 'alpha', status: 'ok', owner: 'rook' }),
      JSON.stringify({ at: '2026-10-27T02:00:00+01:00', job: 'beta', status: 'retry', owner: 'rook' }),
      JSON.stringify({ at: '2026-10-27T03:00:00+01:00', job: 'gamma', status: 'fail', owner: null }),
    ].join('\n'),
  );
  writeFileSync(
    join(runsDir, '2026-10-28.jsonl'),
    JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'alpha', status: 'ok', owner: 'rook' }),
  );
  return createApp({ ...config, runsDir });
}

describe('status board', () => {
  it('links each night to its digest with newest-first status counts', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const app = makeApp();
    const res = await app.request('/');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html.indexOf('/digest/2026-10-28')).toBeLessThan(html.indexOf('/digest/2026-10-27'));
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('ok 1 · retry 0 · fail 0');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a>');
    expect(html).toContain('ok 1 · retry 1 · fail 1');

    for (const night of ['2026-10-28', '2026-10-27']) {
      const digest = await app.request(`/digest/${night}`);
      expect(digest.status).toBe(200);
      expect(await digest.text()).toContain(`digest · ${night}`);
    }
  });

  it('health answers with the lane id', async () => {
    const res = await makeApp().request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});
