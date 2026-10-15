// Fake runtime so tests never call a real AI provider.
globalThis[Symbol.for('kael.runtime.fixture')] = {
  status: () => ({ available: true, label: 'TEST FIXTURE — no AI call', reason: '' }),
  turn: async ({ prompt, signal, model }) => {
    if (prompt.includes('KAEL_MANAGER_REVIEW')) return { summary: 'Review fixture', blocked: false, data: { accept: true, note: 'Hasil fixture sesuai brief dan SOP.' } };
    if (prompt.includes('PERLU-INFO')) return { summary: 'Butuh data', blocked: true, reason: 'Harga supplier belum ada', data: {} };
    if (prompt.includes('LAMBAT')) await new Promise((resolve, reject) => { const t = setTimeout(resolve, 5000); signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }); });
    return { summary: 'Fixture selesai', blocked: false, data: { content: `Hasil fixture (${model || 'default'})\n` + (prompt.match(/SOP divisi v\d+/)?.[0] || 'tanpa SOP') } };
  }
};

globalThis[Symbol.for('kael.builder.fixture')] = {
  turn: async () => ({ summary: 'Fixture Builder', blocked: false, data: { reply: 'Usulan fixture siap ditinjau.', proposal: { name: 'Support Fixture', manager: 'Maya', workers: [{ id: '', name: 'Nara', role: 'Menyiapkan jawaban' }], steps: 'Brief → draft → review → keputusan Founder', criteria: 'Sesuai fakta produk', limits: 'Tidak mengirim atau menyetujui otomatis', provider: 'manual', model: '' } } })
};
