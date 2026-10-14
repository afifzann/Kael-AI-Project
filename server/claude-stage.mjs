import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

function executable() {
  if (process.env.KAEL_CLAUDE_PATH) return { command: process.env.KAEL_CLAUDE_PATH, prefix: [] };
  if (process.platform !== 'win32') return { command: 'claude', prefix: [] };
  const native = path.join(homedir(), '.local/bin/claude.exe');
  if (existsSync(native)) return { command: native, prefix: [] };
  const npm = path.join(process.env.APPDATA || path.join(homedir(), 'AppData/Roaming'), 'npm/node_modules/@anthropic-ai/claude-code');
  if (existsSync(path.join(npm, 'bin/claude.exe'))) return { command: path.join(npm, 'bin/claude.exe'), prefix: [] };
  if (existsSync(path.join(npm, 'cli.js'))) return { command: process.execPath, prefix: [path.join(npm, 'cli.js')] };
  return { command: 'claude.exe', prefix: [] };
}
export { executable as claudeExecutable };
function environment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/(?:_KEY|_TOKEN|_SECRET|_PASSWORD)$|^N8N_|^CODEX_APP_TOOLS_PIPE_PATH$|^ANTHROPIC_|^CLAUDE_CODE_|^CLAUDE_AGENT_/i.test(key)) delete env[key];
  return env;
}
export function claudeStatus(check = spawnSync) {
  const { command, prefix } = executable();
  let available = false;
  try {
    const result = check(command, [...prefix, 'auth', 'status', '--json'], { windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 64000, env: environment() });
    available = result.status === 0 && JSON.parse(result.stdout).loggedIn === true;
  } catch { /* Auth failures expose only a retry instruction, never CLI/account output. */ }
  return { available, label: 'Claude Code lokal', reason: available ? '' : 'Claude Code belum tersedia/login pada server ini. Jalankan claude auth login sebagai user yang menjalankan Kael, lalu periksa lagi.' };
}

// shortcut: tasks are text-only with no tools; add narrowly scoped tools only with a tested action broker.
export async function claudeStage({ folder, prompt, schema, signal, model = '' }, launch = spawn) {
  signal.throwIfAborted();
  if (model && !/^[\w.:-]{1,120}$/.test(model)) throw new Error('Nama model Claude tidak valid. Gunakan alias atau ID model yang tersedia pada akunmu.');
  const jsonSchema = await readFile(schema, 'utf8'); JSON.parse(jsonSchema);
  signal.throwIfAborted();
  const { command, prefix } = executable();
  const args = [...prefix, '--print', '--safe-mode', '--restricted', '--tools', '', '--disallowedTools', 'mcp__*', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--no-session-persistence', '--no-chrome', '--disable-slash-commands', '--max-turns', '4', '--output-format', 'json', '--json-schema', jsonSchema, ...(model ? ['--model', model] : [])];
  return new Promise((resolve, reject) => {
    const child = launch(command, args, { cwd: folder, env: environment(), windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = []; let bytes = 0, failed = false, timeout = false;
    const stop = () => child.kill(); signal.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(() => { timeout = true; stop(); }, 10 * 60 * 1000);
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', stop); };
    child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes > 4_000_000) { failed = true; stop(); } else chunks.push(Buffer.from(chunk)); });
    child.stderr.resume(); child.stdin.on('error', () => {});
    child.on('error', () => { cleanup(); reject(new Error('Claude Code tidak dapat dijalankan. Periksa executable dan login pada server.')); });
    child.on('close', code => {
      cleanup();
      if (signal.aborted) return reject(new Error('Run Claude dihentikan.'));
      if (timeout || failed || code !== 0) return reject(new Error('Run Claude gagal atau batas waktu/output tercapai. Periksa login, model dan kuota sebelum mencoba lagi. Hasil lama tetap tersimpan.'));
      try {
        const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (result.is_error || result.subtype !== 'success') throw new Error();
        const value = result.structured_output;
        if (!value || typeof value.summary !== 'string' || typeof value.blocked !== 'boolean' || typeof value.reason !== 'string' || typeof value.payload !== 'string') throw new Error();
        const data = value.payload ? JSON.parse(value.payload) : {};
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
        resolve({ summary: value.summary, blocked: value.blocked, reason: value.reason, data });
      } catch { reject(new Error('Claude tidak menghasilkan respons terstruktur yang valid. Periksa model/login/kuota lalu coba lagi; tidak ada hasil palsu disimpan.')); }
    });
    child.stdin.end(prompt);
  });
}
