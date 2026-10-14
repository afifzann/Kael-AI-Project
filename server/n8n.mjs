const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';

export function createN8nClient(env = process.env, fetchImpl = fetch) {
  const detailCache = new Map();
  function config() {
    if (!env.N8N_BASE_URL?.trim() || !env.N8N_API_KEY?.trim()) throw new Error('Isi konfigurasi n8n di .env, lalu restart backend.');
    let url;
    try { url = new URL(env.N8N_BASE_URL.trim()); } catch { throw new Error('URL n8n tidak valid.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Gunakan URL HTTPS n8n tanpa kredensial, query atau fragment.');
    return { base: url.href.replace(/\/$/, '').replace(/\/api\/v1$/, ''), key: env.N8N_API_KEY.trim() };
  }
  function clean(value, key, max = 1000) {
    return String(value || '').split(key).join('[RAHASIA]').replace(/https?:\/\/\S+/gi, '[URL]').replace(/Bearer\s+\S+/gi, 'Bearer [RAHASIA]').replace(/((?:api[_ -]?key|token|password|secret|authorization)\s*[:=]\s*)[^\s,;]+/gi, '$1[RAHASIA]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[EMAIL]').slice(0, max);
  }
  async function request(endpoint) {
    const { base, key } = config();
    let response;
    try { response = await fetchImpl(base + '/api/v1/' + endpoint, { method: 'GET', headers: { 'X-N8N-API-KEY': key, accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(10000) }); }
    catch { throw new Error('Tidak dapat menjangkau n8n. Periksa jaringan, TLS dan alamat VPS.'); }
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Akses n8n ditolak. Periksa API key dan izin.' : response.status === 429 ? 'Batas permintaan n8n tercapai. Pemantauan akan mencoba kembali.' : `n8n mengembalikan HTTP ${response.status}.`);
    try {
      const reader = response.body.getReader(); let size = 0; const chunks = [];
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2000000) { await reader.cancel(); throw new Error(); } chunks.push(value); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { throw new Error('Respons n8n tidak valid atau melebihi batas 2 MB.'); }
  }
  function execution(raw, workflowId) {
    if (!identifier(raw?.id) || raw.workflowId !== workflowId || typeof raw.status !== 'string') throw new Error('Format eksekusi n8n tidak sesuai.');
    return { id: raw.id, status: ['new', 'running', 'waiting', 'success', 'error', 'crashed', 'canceled'].includes(raw.status) ? raw.status : 'unknown', startedAt: date(raw.startedAt), stoppedAt: date(raw.stoppedAt), url: config().base + '/workflow/' + workflowId + '/executions/' + raw.id };
  }
  async function list(workflowId, status = '') {
    const entries = []; let cursor = '';
    // shortcut: active lists stop at 500 runs, show incomplete data before increasing capacity.
    for (let page = 0; page < (status ? 5 : 1); page++) {
      const query = new URLSearchParams({ workflowId, limit: '100', includeData: 'false' });
      if (status) query.set('status', status);
      if (cursor) query.set('cursor', cursor);
      const data = await request('executions?' + query);
      if (!Array.isArray(data?.data) || (data.nextCursor && typeof data.nextCursor !== 'string')) throw new Error('Format daftar eksekusi n8n tidak sesuai.');
      entries.push(...data.data.map(e => execution(e, workflowId)));
      cursor = data.nextCursor || ''; if (!cursor) break;
    }
    return { entries, partial: Boolean(cursor) };
  }
  async function snapshot(binding) {
    const { workflowId } = binding;
    if (!identifier(workflowId)) throw new Error('ID workflow tidak valid.');
    const [workflow, recent, running, waiting] = await Promise.all([request('workflows/' + workflowId), list(workflowId), list(workflowId, 'running'), list(workflowId, 'waiting')]);
    if (workflow.id !== workflowId || typeof workflow.active !== 'boolean' || typeof workflow.name !== 'string') throw new Error('Format workflow n8n tidak sesuai.');
    for (const item of recent.entries.filter(e => ['error', 'crashed'].includes(e.status)).slice(0, 10)) {
      let detail = detailCache.get(workflowId + '/' + item.id);
      if (!detail) {
        try {
          const raw = await request('executions/' + item.id + '?includeData=true');
          if (raw.id !== item.id || raw.workflowId !== workflowId) throw new Error();
          const result = raw.data?.resultData, error = result?.error;
          detail = { node: clean(error?.node?.name || result?.lastNodeExecuted || '', config().key, 160), error: clean(error?.message || 'n8n tidak memberikan rincian error.', config().key) };
          detailCache.set(workflowId + '/' + item.id, detail);
          if (detailCache.size > 100) detailCache.delete(detailCache.keys().next().value);
        } catch { detail = { detailUnavailable: true, error: 'Rincian error belum tersedia. Buka eksekusi di n8n.' }; }
      }
      Object.assign(item, detail);
    }
    return { workflowId, workflowName: clean(workflow.name, config().key, 160), active: workflow.active, connection: 'online', checkedAt: new Date().toISOString(), error: '', recent: recent.entries, running: running.entries, waiting: waiting.entries, partial: running.partial || waiting.partial, historyPartial: recent.partial };
  }
  return { snapshot };
}
