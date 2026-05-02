import { Registry } from 'azure-iothub';

let _registry: Registry | null = null;

const registry = (): Registry => {
  if (!_registry) {
    const connStr = process.env.IOT_HUB_SERVICE_CONNECTION_STRING;
    if (!connStr) {
      throw new Error('IOT_HUB_SERVICE_CONNECTION_STRING is not set');
    }
    _registry = Registry.fromConnectionString(connStr);
  }
  return _registry;
};

/**
 * Overwrite the device twin's `properties.desired` with the given object.
 * Uses etag '*' for unconditional update — last write wins (acceptable here:
 * the user is the only writer and conflicts would only arise from a UI race).
 */
export const updateDeviceTwinDesired = async (
  deviceId: string,
  desired: Record<string, unknown>,
): Promise<void> => {
  await registry().updateTwin(
    deviceId,
    { properties: { desired } },
    '*',
  );
};
