import 'server-only';
import local from '@/data/snapshot.json';
import type { Snapshot, SnapshotProtocol } from './types';

const API_URL = process.env.API_URL?.replace(/\/$/, '');

/**
 * Snapshot source: the API when API_URL is configured and reachable (revalidated every 5 minutes),
 * otherwise the snapshot committed by the scoring engine. The dashboard therefore renders the same
 * data shape in both modes and never blocks on a backend being up.
 */
export async function getSnapshot(): Promise<{ snapshot: Snapshot; source: 'api' | 'snapshot' }> {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/v1/snapshot`, { next: { revalidate: 300 } });
      if (res.ok) return { snapshot: (await res.json()) as Snapshot, source: 'api' };
    } catch {
      /* fall through to the committed snapshot */
    }
  }
  return { snapshot: local as unknown as Snapshot, source: 'snapshot' };
}

export async function getProtocol(slug: string): Promise<{ snapshot: Snapshot; protocol: SnapshotProtocol | undefined }> {
  const { snapshot } = await getSnapshot();
  return { snapshot, protocol: snapshot.protocols.find((p) => p.slug === slug) };
}
