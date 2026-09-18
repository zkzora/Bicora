import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ProtocolConfig } from './types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..', '..', '..');
export const DATA_DIR = process.env.DATA_DIR ?? path.join(REPO_ROOT, 'data');
export const METHODOLOGY_VERSION = '1.0.0';

export function loadRegistry(): ProtocolConfig[] {
  const file = path.join(REPO_ROOT, 'config', 'protocols.json');
  const json = JSON.parse(readFileSync(file, 'utf8')) as { protocols: ProtocolConfig[] };
  return json.protocols;
}
