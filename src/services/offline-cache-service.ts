/**
 * Offline Cache Service for Patrol Mode
 * Uses IndexedDB to cache vehicle and pass data for offline lookup
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { PatrolLookupResult, VehicleInfo, PassInfo, ViolationInfo } from '@/app/api/patrol/lookup/route';

const DB_NAME = 'patrol-cache';
const DB_VERSION = 1;

// Store names
const STORES = {
  VEHICLES: 'vehicles',
  PASSES: 'passes',
  VIOLATIONS: 'violations',
  LOOKUP_CACHE: 'lookup-cache',
  SYNC_STATUS: 'sync-status',
} as const;

// Cache expiry time (30 minutes)
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

interface CachedLookup {
  normalizedPlate: string;
  result: PatrolLookupResult;
  cachedAt: number;
  expiresAt: number;
}

interface SyncStatus {
  id: string;
  lastSyncAt: number;
  itemCount: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Initialize and get the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available on the server');
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Vehicles store
        if (!db.objectStoreNames.contains(STORES.VEHICLES)) {
          const vehicleStore = db.createObjectStore(STORES.VEHICLES, {
            keyPath: 'id',
          });
          vehicleStore.createIndex('normalizedPlate', 'normalizedPlate', {
            unique: true,
          });
          vehicleStore.createIndex('licensePlate', 'licensePlate');
        }

        // Passes store
        if (!db.objectStoreNames.contains(STORES.PASSES)) {
          const passStore = db.createObjectStore(STORES.PASSES, {
            keyPath: 'id',
          });
          passStore.createIndex('vehicleId', 'vehicleId');
          passStore.createIndex('status', 'status');
          passStore.createIndex('endTime', 'endTime');
        }

        // Violations store
        if (!db.objectStoreNames.contains(STORES.VIOLATIONS)) {
          const violationStore = db.createObjectStore(STORES.VIOLATIONS, {
            keyPath: 'id',
          });
          violationStore.createIndex('vehicleId', 'vehicleId');
        }

        // Lookup cache store
        if (!db.objectStoreNames.contains(STORES.LOOKUP_CACHE)) {
          const cacheStore = db.createObjectStore(STORES.LOOKUP_CACHE, {
            keyPath: 'normalizedPlate',
          });
          cacheStore.createIndex('expiresAt', 'expiresAt');
        }

        // Sync status store
        if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
          db.createObjectStore(STORES.SYNC_STATUS, { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Cache a lookup result
 */
export async function cacheLookupResult(
  normalizedPlate: string,
  result: PatrolLookupResult
): Promise<void> {
  try {
    const db = await getDB();
    const now = Date.now();

    const cached: CachedLookup = {
      normalizedPlate,
      result,
      cachedAt: now,
      expiresAt: now + CACHE_EXPIRY_MS,
    };

    await db.put(STORES.LOOKUP_CACHE, cached);

    // Also cache individual vehicle data if present
    if (result.vehicle) {
      await db.put(STORES.VEHICLES, {
        ...result.vehicle,
        normalizedPlate,
        cachedAt: now,
      });
    }
  } catch (error) {
    console.error('Failed to cache lookup result:', error);
  }
}

/**
 * Get cached lookup result
 */
export async function getCachedLookup(
  normalizedPlate: string
): Promise<PatrolLookupResult | null> {
  try {
    const db = await getDB();
    const cached = await db.get(STORES.LOOKUP_CACHE, normalizedPlate);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      // Delete expired cache
      await db.delete(STORES.LOOKUP_CACHE, normalizedPlate);
      return null;
    }

    return cached.result;
  } catch (error) {
    console.error('Failed to get cached lookup:', error);
    return null;
  }
}

/**
 * Bulk sync vehicle and pass data for offline use
 */
export async function syncPatrolData(data: {
  vehicles: VehicleInfo[];
  passes: (PassInfo & { vehicleId: string })[];
  violations: (ViolationInfo & { vehicleId: string })[];
}): Promise<void> {
  try {
    const db = await getDB();
    const now = Date.now();

    // Clear old data
    await db.clear(STORES.VEHICLES);
    await db.clear(STORES.PASSES);
    await db.clear(STORES.VIOLATIONS);

    // Batch insert vehicles
    const vehicleTx = db.transaction(STORES.VEHICLES, 'readwrite');
    for (const vehicle of data.vehicles) {
      await vehicleTx.store.put({ ...vehicle, cachedAt: now });
    }
    await vehicleTx.done;

    // Batch insert passes
    const passTx = db.transaction(STORES.PASSES, 'readwrite');
    for (const pass of data.passes) {
      await passTx.store.put({ ...pass, cachedAt: now });
    }
    await passTx.done;

    // Batch insert violations
    const violationTx = db.transaction(STORES.VIOLATIONS, 'readwrite');
    for (const violation of data.violations) {
      await violationTx.store.put({ ...violation, cachedAt: now });
    }
    await violationTx.done;

    // Update sync status
    await db.put(STORES.SYNC_STATUS, {
      id: 'main',
      lastSyncAt: now,
      itemCount: data.vehicles.length + data.passes.length + data.violations.length,
    });
  } catch (error) {
    console.error('Failed to sync patrol data:', error);
    throw error;
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus | null> {
  try {
    const db = await getDB();
    return await db.get(STORES.SYNC_STATUS, 'main');
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return null;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORES.VEHICLES);
    await db.clear(STORES.PASSES);
    await db.clear(STORES.VIOLATIONS);
    await db.clear(STORES.LOOKUP_CACHE);
    await db.delete(STORES.SYNC_STATUS, 'main');
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const db = await getDB();
    const now = Date.now();

    const tx = db.transaction(STORES.LOOKUP_CACHE, 'readwrite');
    const index = tx.store.index('expiresAt');

    let deletedCount = 0;
    let cursor = await index.openCursor(IDBKeyRange.upperBound(now));

    while (cursor) {
      await cursor.delete();
      deletedCount++;
      cursor = await cursor.continue();
    }

    await tx.done;
    return deletedCount;
  } catch (error) {
    console.error('Failed to clean expired cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  vehicleCount: number;
  passCount: number;
  violationCount: number;
  lookupCacheCount: number;
  lastSyncAt: number | null;
}> {
  try {
    const db = await getDB();

    const [vehicleCount, passCount, violationCount, lookupCacheCount, syncStatus] =
      await Promise.all([
        db.count(STORES.VEHICLES),
        db.count(STORES.PASSES),
        db.count(STORES.VIOLATIONS),
        db.count(STORES.LOOKUP_CACHE),
        db.get(STORES.SYNC_STATUS, 'main'),
      ]);

    return {
      vehicleCount,
      passCount,
      violationCount,
      lookupCacheCount,
      lastSyncAt: syncStatus?.lastSyncAt ?? null,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      vehicleCount: 0,
      passCount: 0,
      violationCount: 0,
      lookupCacheCount: 0,
      lastSyncAt: null,
    };
  }
}
