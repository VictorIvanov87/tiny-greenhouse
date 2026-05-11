import iothub from 'azure-iothub';

const { Registry } = iothub;
type Registry = InstanceType<typeof Registry>;

const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';

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
 *
 * In non-firestore (mock/dev) mode, this is a no-op so local development can
 * exercise the control + override flow without an IoT Hub connection string.
 */
export const updateDeviceTwinDesired = async (
  deviceId: string,
  desired: Record<string, unknown>,
): Promise<void> => {
  if (STORAGE_MODE !== 'firestore') {
    return;
  }
  await registry().updateTwin(
    deviceId,
    { properties: { desired } },
    '*',
  );
};
