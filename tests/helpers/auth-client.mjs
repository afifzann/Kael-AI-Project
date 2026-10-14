// Authentication for isolated test servers only. Never reads owner app-data.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const rawFetch = globalThis.fetch.bind(globalThis);
const clients = new Map(); let installed = false;
export const testOwner = { name: 'Pemilik Fixture', email: 'owner@example.test', password: 'fixture-only-password-2026', confirm: 'fixture-only-password-2026' };
export async function authenticateTestServer(url, directory) {
  const status = await (await rawFetch(url + '/api/auth/status')).json();
  const response = await rawFetch(url + '/api/auth/' + (status.needsSetup ? 'setup' : 'login'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...testOwner, ...(status.needsSetup ? { setupKey: (await readFile(path.join(directory, 'owner-setup.key'), 'utf8')).trim() } : {}) }),
  });
  if (!response.ok) throw new Error('Test owner setup/login failed: HTTP ' + response.status);
  const { csrf } = await response.json(); clients.set(new URL(url).origin, { csrf, cookie: response.headers.get('set-cookie').split(';')[0] });
  if (!installed) {
    installed = true;
    globalThis.fetch = (input, options = {}) => {
      const target = new URL(input instanceof Request ? input.url : String(input)), client = clients.get(target.origin);
      if (!client) return rawFetch(input, options);
      const headers = new Headers(input instanceof Request ? input.headers : undefined); new Headers(options.headers).forEach((v, k) => headers.set(k, v));
      if (!headers.has('Cookie')) headers.set('Cookie', client.cookie);
      if (!headers.has('X-Kael-CSRF')) headers.set('X-Kael-CSRF', client.csrf);
      return rawFetch(input, { ...options, headers });
    };
  }
  return () => clients.delete(new URL(url).origin);
}
