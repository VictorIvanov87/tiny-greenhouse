import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..', '..', 'data', 'mock');

export async function readMock<T>(file: string): Promise<T> {
  const fullPath = resolve(root, file);
  const buffer = await readFile(fullPath, 'utf-8');
  return JSON.parse(buffer) as T;
}
