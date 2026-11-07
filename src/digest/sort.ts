import type { DigestRow } from './types.js';

export function sortDigestRows(rows: DigestRow[]): DigestRow[] {
  return [...rows].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}
