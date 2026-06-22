/**
 * Abstraction over artifact blob storage (Phase 5 §9 "StoragePort").
 *
 * The local filesystem adapter is the default for dev/self-host. In production
 * this is swapped for an S3 adapter that returns short-TTL signed URLs and
 * offloads download throughput from the app tier — without touching callers.
 */
export const STORAGE_PORT = 'STORAGE_PORT';

export interface StoragePort {
  /** Persist bytes under a key. Returns the canonical storage key. */
  put(key: string, data: Buffer): Promise<string>;

  /** Read bytes for a key. Throws if missing. */
  get(key: string): Promise<Buffer>;

  exists(key: string): Promise<boolean>;

  delete(key: string): Promise<void>;
}
