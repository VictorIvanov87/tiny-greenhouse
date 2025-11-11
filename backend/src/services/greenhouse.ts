import { GreenhouseConfig, GreenhouseConfigType } from '../lib/schemas';
import { readMock } from '../lib/file';

const stateByUser = new Map<string, GreenhouseConfigType>();

const loadDefault = async () => {
  const mock = await readMock<unknown>('greenhouse.json');
  return GreenhouseConfig.parse(mock);
};

export const getGreenhouseConfig = async (uid: string): Promise<GreenhouseConfigType> => {
  const current = stateByUser.get(uid);
  if (current) {
    return current;
  }
  const defaults = await loadDefault();
  stateByUser.set(uid, defaults);
  return defaults;
};

export const saveGreenhouseConfig = (uid: string, config: GreenhouseConfigType) => {
  stateByUser.set(uid, config);
  return config;
};
