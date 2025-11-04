import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'data', 'mock');

export async function readMock<T>(file: string): Promise<T> {
  const fullPath = resolve(root, file);
  const buffer = await readFile(fullPath, 'utf-8');
  return JSON.parse(buffer) as T;
}
