import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: '' };
let runsDir: string;

afterEach(() => {
  if (runsDir) rmSync(runsDir, { recursive: true, force: true });
  runsDir = '';
});

function makeApp(nightContents?: string) {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  if (nightContents !== undefined) writeFileSync(join(runsDir, '2026-10-28.jsonl'), nightContents);
  return createApp({ ...config, runsDir });
}

describe('digest page', () => {
  it('renders sorted rows and highlights repeated retries and failures', async () => {
    const app = makeApp([
      '{"at":"2026-10-28T01:00:00+01:00","job":"zeta","status":"fail","owner":null,"error":"broken"}',
      '{"at":"2026-10-28T01:01:00+01:00","job":"alpha","status":"retry","owner":"rook"}',
      '{"at":"2026-10-28T01:02:00+01:00","job":"alpha","status":"retry","owner":"rook"}',
      '{"at":"2026-10-28T01:03:00+01:00","job":"alpha","status":"retry","owner":"rook"}',
    ].join('\n'));

    const response = await app.request('/digest/2026-10-28');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html.indexOf('alpha')).toBeLessThan(html.indexOf('zeta'));
    expect(html).toContain('<strong class="warn">3</strong>');
    expect(html).toContain('<strong class="warn">fail</strong>');
    expect(html).toContain('broken');
    expect(html).toContain('—');
    expect(html).not.toContain('<script');
  });

  it('returns 404 when the night file does not exist', async () => {
    const response = await makeApp().request('/digest/2026-10-28');
    expect(response.status).toBe(404);
  });

  it('renders the empty-night message for an empty file', async () => {
    const response = await makeApp('').request('/digest/2026-10-28');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('nothing ran');
  });

  it('renders valid rows when the file contains a malformed line', async () => {
    const app = makeApp('not json\n{"at":"2026-10-28T01:00:00+01:00","job":"alpha","status":"ok","owner":"rook"}');
    const response = await app.request('/digest/2026-10-28');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('1 malformed line ignored');
    expect(html).toContain('alpha');
  });
});
