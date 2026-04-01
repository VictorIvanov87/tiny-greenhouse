import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = (): string => {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!cs) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
  return cs;
};

const containerName = (): string =>
  process.env.AZURE_STORAGE_CONTAINER ?? 'camera-images';

/**
 * Upload a buffer to Azure Blob Storage.
 * Returns the public URL of the uploaded blob.
 * Throws if the upload fails (e.g. container does not exist, bad credentials).
 */
export async function uploadBlob(
  blobPath: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const client = BlobServiceClient.fromConnectionString(connectionString());
  const container = client.getContainerClient(containerName());
  const blob = container.getBlockBlobClient(blobPath);
  await blob.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blob.url;
}
