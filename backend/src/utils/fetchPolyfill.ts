import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Universal Native Fetch Implementation for Node.js < 18 (e.g. Node 16.x)
 * Uses native http/https with zero external dependencies.
 */
export function nativeFetch(input: string | URL, init?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const urlStr = typeof input === 'string' ? input : input.toString();
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {};
      if (init?.headers) {
        if (typeof init.headers.forEach === 'function') {
          init.headers.forEach((v: string, k: string) => {
            headers[k.toLowerCase()] = v;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [k, v] of init.headers) {
            headers[k.toLowerCase()] = v;
          }
        } else {
          for (const [k, v] of Object.entries(init.headers)) {
            headers[k.toLowerCase()] = String(v);
          }
        }
      }

      let postData: any = null;
      if (init?.body) {
        if (typeof init.body === 'string') {
          postData = Buffer.from(init.body);
        } else if (Buffer.isBuffer(init.body)) {
          postData = init.body;
        } else if (typeof init.body === 'object') {
          postData = Buffer.from(JSON.stringify(init.body));
          if (!headers['content-type']) {
            headers['content-type'] = 'application/json';
          }
        }
        if (postData && !headers['content-length']) {
          headers['content-length'] = String(postData.length);
        }
      }

      const reqOptions: https.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: (init?.method || 'GET').toUpperCase(),
        headers,
      };

      const req = client.request(reqOptions, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });

        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          const bodyText = bodyBuffer.toString('utf8');

          const responseObj = {
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: {
              get: (headerName: string) => {
                const val = res.headers[headerName.toLowerCase()];
                return Array.isArray(val) ? val.join(', ') : val || null;
              },
              raw: () => res.headers,
            },
            text: async () => bodyText,
            json: async () => {
              if (!bodyText.trim()) return {};
              return JSON.parse(bodyText);
            },
            buffer: async () => bodyBuffer,
          };

          resolve(responseObj);
        });
      });

      // Handle signal cancellation
      if (init?.signal) {
        if (init.signal.aborted) {
          req.destroy();
          return reject(new Error('The operation was aborted.'));
        }
        init.signal.addEventListener('abort', () => {
          req.destroy();
          reject(new Error('The operation was aborted.'));
        });
      }

      req.on('error', (err) => {
        reject(err);
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Polyfill globalThis.fetch and global.fetch if not present
if (typeof (globalThis as any).fetch !== 'function') {
  (globalThis as any).fetch = nativeFetch;
}
if (typeof (global as any).fetch !== 'function') {
  (global as any).fetch = nativeFetch;
}

// Polyfill AbortSignal.timeout for Node < 17.3
if (typeof (AbortSignal as any).timeout !== 'function') {
  (AbortSignal as any).timeout = function(ms: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try {
        controller.abort();
      } catch {}
    }, ms);
    if (typeof (timer as any)?.unref === 'function') {
      (timer as any).unref();
    }
    return controller.signal;
  };
}
