// Isolated child-process transport; no production n8n calls or credentials.
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
let completedAt;
globalThis.fetch = async (url, options) => {
  if (!url.startsWith('https://n8n.fixture.invalid/api/v1/') || options.method !== 'GET') throw new Error('Unexpected fixture request');
  const parsed = new URL(url); let body;
  if (parsed.pathname.endsWith('/workflows/wf1')) {
    if (process.env.KAEL_N8N_RACE) {
      await writeFile(path.join(process.env.KAEL_DATA_DIR, 'poll-started'), 'yes');
      const deadline = Date.now() + 8000;
      while (true) { try { await access(path.join(process.env.KAEL_DATA_DIR, 'poll-release')); break; } catch { if (Date.now() > deadline) throw new Error('Fixture release timed out'); await new Promise(r => setTimeout(r, 20)); } }
    }
    body = { id: 'wf1', name: 'Fixture workflow', active: true };
  }
  else if (parsed.pathname.endsWith('/executions/bad')) body = { id: 'bad', workflowId: 'wf1', data: { resultData: { lastNodeExecuted: 'Assistant Agent', error: { message: 'Authorization failed token=fixture-secret' } } } };
  else if (parsed.searchParams.has('status')) body = { data: [] };
  else { completedAt ||= new Date().toISOString(); body = { data: [{ id: 'bad', workflowId: 'wf1', status: 'error', startedAt: completedAt, stoppedAt: completedAt }] }; }
  return Response.json(body);
};
