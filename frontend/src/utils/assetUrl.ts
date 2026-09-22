/**
 * assetUrl — resolves a public-folder asset path so it works in BOTH:
 *   - Browser / web  (served from http://localhost or a hosting URL)
 *   - Electron       (loaded from file:// after `vite build --base='./')
 *
 * Handles data: URIs, blob: URIs, http(s): URIs, and root-relative paths.
 */

const _base: string = (() => {
  try {
    const moduleUrl = new URL(import.meta.url);
    const assetsDir = moduleUrl.href.substring(0, moduleUrl.href.lastIndexOf('/'));
    const appRoot   = assetsDir.substring(0, assetsDir.lastIndexOf('/'));
    return appRoot.endsWith('/') ? appRoot : appRoot + '/';
  } catch {
    return '/';
  }
})();

export function assetUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http:') || path.startsWith('https:') || path.startsWith('blob:')) {
    return path;
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    const stripped = path.startsWith('/') ? path.slice(1) : path;
    return _base + stripped;
  }
  return path;
}
