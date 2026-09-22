import axios from 'axios';

// Detect Electron environment
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;

// Single source of truth for the API base URL (local backend in Electron, VITE_API_URL in web)
export const API_BASE_URL = isElectron
  ? 'http://localhost:3000/api'
  : (import.meta.env.VITE_API_URL || '/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
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

    // If browser is offline and it's a mutating request, reject immediately to trigger offline queueing
    if (!navigator.onLine && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const offlineError = new Error('Browser is offline');
      (offlineError as any).isOfflineTrigger = true;
      (offlineError as any).config = config;
      return Promise.reject(offlineError);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    
    // Check if it's a mutating request that failed due to network / offline
    const isMutation = ['post', 'put', 'patch', 'delete'].includes(config?.method?.toLowerCase() || '');
    const isOfflineOrNetworkError = 
      error.isOfflineTrigger ||
      !navigator.onLine ||
      error.message === 'Network Error' ||
      !error.response ||
      [502, 503, 504].includes(error.response?.status);

    if (isMutation && isOfflineOrNetworkError) {
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
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const fhirApi = axios.create({
  baseURL: '/fhir',
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
