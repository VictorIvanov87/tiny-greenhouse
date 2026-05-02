import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Resolve from process cwd. Dev (`tsx watch src/app.ts`) runs from `backend/`;
// the deployed bundle on Azure runs from `/home/site/wwwroot/`. In both cases
// `data/mock/` sits directly under cwd — `import.meta.url` would point inside
// the tsup bundle in prod and resolve to the wrong directory.
const root = resolve(process.cwd(), 'data', 'mock');

export async function readMock<T>(file: string): Promise<T> {
  const fullPath = resolve(root, file);
  const buffer = await readFile(fullPath, 'utf-8');
  return JSON.parse(buffer) as T;
}
