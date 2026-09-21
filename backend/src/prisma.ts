import { PrismaClient } from '@prisma/client';
import { getLayer, updateLayerHealth, recalculateActiveLayer, DbLayer } from './services/connectionManager.js';
import dotenv from 'dotenv';
dotenv.config();

function addConnectionLimit(url: string, limit = 5): string {
  if (!url) return '';
  if (url.includes('connection_limit')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=${limit}`;
}

const rawNeonUrl = process.env.NEON_DATABASE_URL || '';
const neonUrl = rawNeonUrl
  ? (rawNeonUrl.includes('connect_timeout')
      ? rawNeonUrl
      : `${rawNeonUrl}${rawNeonUrl.includes('?') ? '&' : '?'}connect_timeout=15`)
  : '';

const primaryUrl = addConnectionLimit(process.env.DATABASE_URL || neonUrl || '', 5);
const standbyUrl = process.env.STANDBY_DATABASE_URL ? addConnectionLimit(process.env.STANDBY_DATABASE_URL, 5) : '';
const cloudUrl = neonUrl ? addConnectionLimit(neonUrl, 5) : '';

const primaryClient = new PrismaClient({ datasources: { db: { url: primaryUrl } } });

export const prismaClients: Record<Exclude<DbLayer, 'OFFLINE'>, PrismaClient> = {
  PRIMARY: primaryClient,
  STANDBY: standbyUrl ? new PrismaClient({ datasources: { db: { url: standbyUrl } } }) : primaryClient,
  CLOUD:   cloudUrl   ? new PrismaClient({ datasources: { db: { url: cloudUrl } } })   : primaryClient,
};

// Auto-failover and retry helper
async function runWithRetry(fn: (client: PrismaClient) => Promise<any>, attempt = 1): Promise<any> {
  const activeLayer = getLayer();
  
  // If we are completely offline, fall back to trying primary
  const client = prismaClients[activeLayer === 'OFFLINE' ? 'PRIMARY' : activeLayer] || prismaClients.PRIMARY;
  try {
    return await fn(client);
  } catch (error: any) {
    const errorMessage = error.message || '';
    
    // Pool exhaustion is transient – do NOT mark the layer as unhealthy for this
    const isPoolExhaustion =
      error.code === 'P2037' ||
      errorMessage.includes('Timed out fetching a new connection from the connection pool') ||
      errorMessage.includes('Pool timed out') ||
      errorMessage.includes('too many clients') ||
      errorMessage.includes('Too many database connections');

    // Real connection failures – the DB is unreachable
    const isConnectionError = 
      !isPoolExhaustion && (
        error.code?.startsWith('P10') || // Prisma P1001, P1002, P1008 etc.
        errorMessage.includes('connect ECONNREFUSED') ||
        errorMessage.includes('Can\'t reach database server') ||
        errorMessage.includes('connection timeout') ||
        errorMessage.includes('timeout expired') ||
        errorMessage.includes('Server closed connection') ||
        errorMessage.includes('does not support') ||
        errorMessage.includes('Client has been closed') ||
        error.name === 'PrismaClientInitializationError'
      );

    // We retry on both — but only mark the layer unhealthy on real failures
    const shouldRetry = (isConnectionError || isPoolExhaustion) && attempt < 4;

    if (shouldRetry) {
      if (isConnectionError) {
        console.warn(`[PrismaProxy] Query failed on layer ${activeLayer} due to connection error. Error: ${errorMessage}`);
        // Mark current layer as unhealthy so recalculate picks the next one
        updateLayerHealth(activeLayer, false, errorMessage || 'Connection failed during query');
        recalculateActiveLayer();
      } else {
        // Pool exhaustion — just warn and retry with backoff without changing layer health
        console.warn(`[PrismaProxy] Connection pool exhausted on layer ${activeLayer}. Retrying (attempt ${attempt})…`);
        await new Promise(r => setTimeout(r, 100 * attempt));
      }

      const nextLayer = getLayer();
      if (nextLayer !== 'OFFLINE') {
        return runWithRetry(fn, attempt + 1);
      }
    }
    throw error;
  }
}

// Helper to create a deferred Prisma promise wrapper that does NOT execute queries until awaited / then'd
function createDeferredPrismaPromise(executeFn: () => Promise<any>) {
  let innerPromise: Promise<any> | null = null;
  const getOrCreatePromise = () => {
    if (!innerPromise) {
      innerPromise = executeFn();
    }
    return innerPromise;
  };

  return {
    [Symbol.toStringTag]: 'PrismaPromise',
    then(onfulfilled?: any, onrejected?: any) {
      return getOrCreatePromise().then(onfulfilled, onrejected);
    },
    catch(onrejected?: any) {
      return getOrCreatePromise().catch(onrejected);
    },
    finally(onfinally?: any) {
      return getOrCreatePromise().finally(onfinally);
    }
  };
}

// Proxy delegates all operations to the active layer's PrismaClient at runtime with automatic retry
export const prisma = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (prop in target) {
      return (target as any)[prop];
    }

    const activeLayer = getLayer();
    const activeClient = prismaClients[activeLayer === 'OFFLINE' ? 'PRIMARY' : activeLayer] || prismaClients.PRIMARY;
    const val = Reflect.get(activeClient, prop);

    // Wrap top-level functions like $queryRaw, $transaction, $executeRaw
    if (typeof val === 'function') {
      return (...args: any[]) => {
        if (prop === '$connect' || prop === '$disconnect') {
          return val.apply(activeClient, args);
        }
        return createDeferredPrismaPromise(() =>
          runWithRetry(client => Reflect.get(client, prop).apply(client, args))
        );
      };
    }

    // Wrap model clients (e.g. user, patient)
    if (val && typeof val === 'object') {
      return new Proxy(val, {
        get(modelTarget, modelProp) {
          const modelVal = Reflect.get(modelTarget, modelProp);
          if (typeof modelVal === 'function') {
            return (...args: any[]) => {
              return createDeferredPrismaPromise(() =>
                runWithRetry(client => {
                  const m = Reflect.get(client, prop);
                  const method = Reflect.get(m, modelProp);
                  return method.apply(m, args);
                })
              );
            };
          }
          return modelVal;
        }
      });
    }

    return val;
  }
}) as PrismaClient;

