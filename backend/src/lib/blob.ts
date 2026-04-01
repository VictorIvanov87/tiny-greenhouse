import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';

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

/**
 * Generate a short-lived SAS URL for a blob path.
 * The URL is valid for `ttlMinutes` minutes (default: 60).
 */
export async function getBlobSasUrl(blobPath: string, ttlMinutes = 60): Promise<string> {
  const client = BlobServiceClient.fromConnectionString(connectionString());
  const container = client.getContainerClient(containerName());
  const blob = container.getBlockBlobClient(blobPath);

  const expiresOn = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return blob.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn,
  });
}
