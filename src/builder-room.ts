export const builderAgent = {
  id: 'office-builder', name: 'Builder', role: 'Perancang kantor & divisi', divisionId: 'builder', manager: false,
};

// This is the owner's existing Codex chat, not a separate employee runtime.
export const builderSession = {
  title: 'Builder',
  threadId: '01a1299a-b553-7902-921f-fa99bc978f1e',
  url: 'codex://threads/01a1299a-b553-7902-921f-fa99bc978f1e',
};

export function builderChatLink(presence?: BuilderPresence) {
  return presence?.connection === 'online' && /^codex:\/\/threads\/[a-f0-9-]{36}$/.test(presence.chatUrl || '')
    ? `<a class="op-button primary" href="${presence!.chatUrl}">Lanjut di Codex ↗</a>`
    : presence?.connection === 'online' && ['Claude', 'Codex'].includes(presence.source || '') ? `<span class="op-muted">Sesi Builder · ${presence.source}</span>` : '<span class="op-muted">Sesi coding agent desktop belum dihubungkan.</span>';
}

export type BuilderPresence = {
  connection: 'online' | 'disconnected'; status: 'working' | 'completed' | 'interrupted' | 'unknown';
  checkedAt: string; lastEventAt: string; turnId: string; partial: boolean; error: string;
  chatUrl?: string; source?: 'Claude' | 'Codex';
};
export function builderActivity(presence?: BuilderPresence, now = Date.now()) {
  if (!presence || presence.connection !== 'online' || !Number.isFinite(Date.parse(presence.checkedAt)) || now - Date.parse(presence.checkedAt) > 20000) return { kind: 'offline', text: 'Chat belum tersinkron', typing: false, canWalk: false };
  const working = presence.status === 'working' && Number.isFinite(Date.parse(presence.lastEventAt)) && now - Date.parse(presence.lastEventAt) < 120000;
  const idle = presence.status === 'completed' || presence.status === 'interrupted';
  return { kind: working ? 'running' : 'idle', text: working ? `Bekerja · ${presence.source || 'Codex'}` : idle ? 'Santai · Sesi Builder' : 'Menunggu konfirmasi status', typing: working, canWalk: idle };
}
