import {
  EventHubConsumerClient,
  type ReceivedEventData,
  type PartitionContext,
} from '@azure/event-hubs';
import { ContainerClient } from '@azure/storage-blob';
import { BlobCheckpointStore } from '@azure/eventhubs-checkpointstore-blob';
import type { FastifyBaseLogger } from 'fastify';
import { ingestTelemetry } from '../services/telemetry-ingest';

type Logger = FastifyBaseLogger;

// ---------------------------------------------------------------------------
// Azure IoT Hub consumer — reads device-to-cloud messages via the built-in
// Event Hub-compatible endpoint. Checkpoints are stored in Azure Blob Storage
// so the consumer resumes where it left off after restarts.
// ---------------------------------------------------------------------------

let client: EventHubConsumerClient | null = null;

function env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

async function handleMessage(
  log: Logger,
  context: PartitionContext,
  events: ReceivedEventData[],
): Promise<void> {
  for (const event of events) {
    const deviceId = event.systemProperties?.['iothub-connection-device-id'] as
      | string
      | undefined;

    if (!deviceId) {
      log.warn({ enqueuedTime: event.enqueuedTimeUtc }, 'IoT event missing device ID, skipping');
      continue;
    }

    const messageType =
      (event.properties?.messageType as string | undefined) ??
      (event.systemProperties?.['iothub-message-source'] as string | undefined);

    log.info(
      { deviceId, messageType, partition: context.partitionId },
      'IoT event received',
    );

    try {
      if (messageType === 'telemetry' || !messageType) {
        // Default: treat as telemetry (ESP32 sends JSON body)
        const body =
          typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

        // Inject device_id if not present in the payload (IoT Hub provides it)
        if (!body.device_id) {
          body.device_id = deviceId;
        }

        const result = await ingestTelemetry(
          body,
          event.enqueuedTimeUtc?.toISOString(),
        );
        if (result.ok) {
          log.info({ deviceId }, 'Telemetry ingested via IoT Hub');
        } else {
          log.warn({ deviceId, code: result.code, message: result.message }, 'Telemetry rejected');
        }
      } else if (messageType === 'status') {
        log.info({ deviceId, body: event.body }, 'Device status received');
        // Future: persist device status
      } else {
        log.debug({ deviceId, messageType }, 'Unhandled IoT message type');
      }
    } catch (err) {
      log.error(err, `Error processing IoT event from ${deviceId}`);
    }
  }

  // Checkpoint after processing the batch so we don't reprocess on restart
  if (events.length > 0) {
    await context.updateCheckpoint(events[events.length - 1]);
  }
}

export async function startIotConsumer(log: Logger): Promise<void> {
  const eventHubConnectionString = env('IOT_HUB_EVENT_HUB_CONNECTION_STRING');
  const eventHubName = env('IOT_HUB_EVENT_HUB_NAME');
  const storageConnectionString = env('AZURE_STORAGE_CONNECTION_STRING');
  const checkpointContainer = process.env.IOT_HUB_CHECKPOINT_CONTAINER ?? 'iot-checkpoints';

  // Create (or reference) the checkpoint container
  const containerClient = new ContainerClient(
    storageConnectionString,
    checkpointContainer,
  );
  await containerClient.createIfNotExists();

  const checkpointStore = new BlobCheckpointStore(containerClient);

  client = new EventHubConsumerClient(
    '$Default',
    eventHubConnectionString,
    eventHubName,
    checkpointStore,
  );

  const subscription = client.subscribe({
    processEvents: (events, context) => handleMessage(log, context, events),
    processError: async (err, context) => {
      log.error(
        err,
        `IoT Hub consumer error on partition ${context.partitionId}`,
      );
    },
  });

  log.info(
    { eventHubName, checkpointContainer },
    'IoT Hub consumer started',
  );

  // Keep reference for graceful shutdown
  (client as EventHubConsumerClient & { _subscription?: typeof subscription })._subscription =
    subscription;
}

export async function stopIotConsumer(log: Logger): Promise<void> {
  if (client) {
    log.info('Stopping IoT Hub consumer...');
    await client.close();
    client = null;
    log.info('IoT Hub consumer stopped');
  }
}
