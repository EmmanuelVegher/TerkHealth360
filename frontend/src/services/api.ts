import axios from 'axios';

// Detect Electron environment reliably across preload, file:// protocol, and user-agent
export const isElectron = typeof window !== 'undefined' && (
  !!(window as any).electronAPI?.isElectron ||
  window.location.protocol === 'file:' ||
  /electron/i.test(navigator.userAgent)
);

// Single source of truth for the API base URL (local backend in Electron, VITE_API_URL in web)
export const API_BASE_URL = isElectron
  ? 'http://localhost:3000/api'
  : (import.meta.env.VITE_API_URL || '/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // NOTE: In local hospital intranet/LAN setups, the server is on localhost or LAN IP.
    // We NEVER reject requests prematurely based on navigator.onLine, because local network
    // communication to the local server succeeds even when there is no public Internet connection.

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    
    // Check if this endpoint should NEVER be intercepted into the offline queue:
    // 1. Authentication endpoints (login must always validate against database/server)
    // 2. AI folder extraction / computer vision analysis (analytical query, not a syncable write)
    // 3. Requests with explicit skipOfflineQueue flag
    // 4. Request timeouts (ECONNABORTED)
    const url = (config?.url || '').toLowerCase();
    const isExcludedFromOfflineQueue =
      (config as any)?.skipOfflineQueue ||
      url.includes('/auth/') ||
      url.includes('/records-migration/extract-folder') ||
      url.includes('/records-migration/check-patient-match') ||
      url.includes('/medgemma') ||
      url.includes('/openmed') ||
      error.code === 'ECONNABORTED';

    // Check if it's a mutating request that failed due to real network disconnect
    const isMutation = ['post', 'put', 'patch', 'delete'].includes(config?.method?.toLowerCase() || '');
    const isOfflineOrNetworkError = 
      error.isOfflineTrigger ||
      error.message === 'Network Error' ||
      !error.response ||
      [502, 503, 504].includes(error.response?.status);

    if (isMutation && isOfflineOrNetworkError && !isExcludedFromOfflineQueue) {
      // Do not store massive file/image payloads in localStorage offline queue (exceeds 5MB localStorage limit)
      const dataStr = typeof config?.data === 'string' ? config.data : JSON.stringify(config?.data || {});
      if (dataStr.length > 100000) {
        return Promise.reject(error);
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      let reqData = config.data;
      try {
        if (typeof reqData === 'string') {
          reqData = JSON.parse(reqData);
        }
      } catch (_) {}

      // Add to localStorage queue
      const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
      queue.push({
        id: tempId,
        method: config.method,
        url: config.url,
        data: reqData,
        timestamp: Date.now(),
      });
      localStorage.setItem('offline_sync_queue', JSON.stringify(queue));

      // Notify Layout/Components
      window.dispatchEvent(new CustomEvent('offline-sync-updated', { detail: { count: queue.length } }));

      // Return simulated success response
      return Promise.resolve({
        data: {
          success: true,
          offline: true,
          id: tempId,
          ...reqData,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('cached_user');
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const fhirApi = axios.create({
  baseURL: isElectron ? 'http://localhost:3000/fhir' : '/fhir',
  headers: {
    'Content-Type': 'application/fhir+json',
  },
});

fhirApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Background Offline Sync Engine ──
let isSyncing = false;

export async function runBackgroundSync() {
  if (isSyncing) return;
  
  const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
  if (queue.length === 0) {
    window.dispatchEvent(new CustomEvent('offline-sync-updated', { detail: { count: 0 } }));
    return;
  }

  // Verify connectivity first
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/config/modules`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
  } catch {
    return; // offline
  }

  isSyncing = true;
  console.log(`[OfflineSync] Found ${queue.length} pending offline transactions. Syncing…`);

  const idMap = JSON.parse(localStorage.getItem('offline_id_mappings') || '{}');
  const remainingQueue = [];

  // Helper function to recursively replace tempIds in any object/string
  const replaceTempIds = (obj: any, mappings: Record<string, string>): any => {
    if (typeof obj === 'string') {
      return mappings[obj] || obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => replaceTempIds(item, mappings));
    }
    if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const key of Object.keys(obj)) {
        newObj[key] = replaceTempIds(obj[key], mappings);
      }
      return newObj;
    }
    return obj;
  };

  for (const item of queue) {
    try {
      // 1. Resolve any temporary IDs in the URL
      let resolvedUrl = item.url;
      for (const [tempId, realId] of Object.entries(idMap)) {
        resolvedUrl = resolvedUrl.replace(tempId, realId as string);
      }

      // 2. Resolve any temporary IDs in the Payload
      const resolvedData = replaceTempIds(item.data, idMap);

      // 3. Dispatch request to the server using basic axios to bypass interceptor queueing
      const token = localStorage.getItem('token');
      const response = await axios({
        method: item.method,
        url: `/api${resolvedUrl.startsWith('/') ? '' : '/'}${resolvedUrl}`,
        data: resolvedData,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // 4. Map the tempId to the returned database ID
      const responseData = response.data?.data || response.data;
      const realId = responseData?.id;
      if (realId && item.id) {
        idMap[item.id] = realId;
      }
      console.log(`[OfflineSync] Synced item ${item.url} successfully. Mapping: ${item.id} -> ${realId || 'none'}`);

    } catch (err: any) {
      console.error(`[OfflineSync] Item sync failed for ${item.url}. Keeping in queue. Error:`, err.message);
      remainingQueue.push(item);
    }
  }

  localStorage.setItem('offline_sync_queue', JSON.stringify(remainingQueue));
  localStorage.setItem('offline_id_mappings', JSON.stringify(idMap));
  isSyncing = false;

  window.dispatchEvent(new CustomEvent('offline-sync-updated', { detail: { count: remainingQueue.length } }));
}

if (typeof window !== 'undefined') {
  setInterval(runBackgroundSync, 10000);
  window.addEventListener('online', runBackgroundSync);
}
