import type { NightDigest } from '../digest/types.js';
import { sortDigestRows } from '../digest/sort.js';

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  const rows = sortDigestRows(digest.rows);

  return (
    <>
      <h1>digest · {night}</h1>
      {digest.malformedLines > 0 && (
        <p class="warn">{digest.malformedLines} malformed {digest.malformedLines === 1 ? 'line' : 'lines'} ignored</p>
      )}
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first time</th>
              <th>last time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const attention = row.retries >= 3 || row.lastStatus === 'fail';
              return (
                <tr>
                  <td>{row.job}</td>
                  <td>{row.owner ?? '—'}</td>
                  <td>{row.runs}</td>
                  <td>{attention && row.retries >= 3 ? <strong class="warn">{row.retries}</strong> : row.retries}</td>
                  <td>{row.lastStatus === 'fail' ? <strong class="warn">fail</strong> : row.lastStatus}</td>
                  <td>{row.lastError ?? '—'}</td>
                  <td>{row.firstAt}</td>
                  <td>{row.lastAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
