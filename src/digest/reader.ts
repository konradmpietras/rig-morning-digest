import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight } from './types.js';

type RunRecord = {
  at: string;
  job: string;
  status: DigestRow['lastStatus'];
  owner: string | null;
  error?: string;
};

function parseRunRecord(value: unknown): RunRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.at !== 'string' ||
    typeof record.job !== 'string' ||
    record.job.length === 0 ||
    (record.status !== 'ok' && record.status !== 'retry' && record.status !== 'fail') ||
    (record.owner !== null && typeof record.owner !== 'string') ||
    (record.error !== undefined && typeof record.error !== 'string')
  ) {
    return null;
  }

  return {
    at: record.at,
    job: record.job,
    status: record.status,
    owner: record.owner,
    ...(typeof record.error === 'string' ? { error: record.error } : {}),
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  const lines = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8').split(/\r?\n/);
  const byJob = new Map<string, DigestRow>();
  let malformedLines = 0;

  for (const line of lines) {
    if (line.trim() === '') continue;

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      malformedLines += 1;
      continue;
    }

    const record = parseRunRecord(value);
    if (!record) {
      malformedLines += 1;
      continue;
    }

    const row = byJob.get(record.job);
    if (!row) {
      byJob.set(record.job, {
        job: record.job,
        owner: record.owner,
        runs: 1,
        retries: record.status === 'retry' ? 1 : 0,
        lastStatus: record.status,
        lastError: record.error ?? null,
        firstAt: record.at,
        lastAt: record.at,
      });
      continue;
    }

    row.runs += 1;
    if (record.status === 'retry') row.retries += 1;
    row.lastStatus = record.status;
    row.lastError = record.error ?? null;
    row.lastAt = record.at;
  }

  return { rows: [...byJob.values()], malformedLines };
};
