// Opt-in: native Claude CLI + project hooks, entirely separate fixture office, no business task execution.
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateTestServer } from '../tests/helpers/auth-client.mjs';
import { officeRequest } from './office.mjs';
import { claudeExecutable } from '../server/claude-stage.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)), base = path.join(root, 'evidence/native-office-smoke'); await mkdir(base, { recursive: true });
const directory = await mkdtemp(path.join(base, 'run-'));
const server = spawn(process.execPath, ['--import', './tests/fixtures/agent-runtime.mjs', 'server/index.mjs'], { cwd: root, windowsHide: true, env: { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
let clearAuth;
try {
  const url = await new Promise((resolve, reject) => { const timer = setTimeout(() => { server.kill(); reject(Error('Startup timeout')); }, 15000); server.stdout.on('data', b => { const m = b.toString().match(/http:\/\/127.0.0.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } }); server.on('error', reject); server.on('exit', () => { clearTimeout(timer); reject(Error('Fixture server exited')); }); });
  clearAuth = await authenticateTestServer(url, directory);
  const response = await fetch(url + '/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 0, command: { type: 'division', name: 'Support QA sintetis', manager: 'Maya QA', worker: 'Nara QA', role: 'Draft jawaban sintetis' } }) });
  if (!response.ok) throw Error('Fixture setup failed');
  const nativeId = randomUUID(), { command, prefix } = claudeExecutable();
  const env = { ...process.env, KAEL_DATA_DIR: directory, KAEL_PORT: new URL(url).port };
  for (const key of Object.keys(env)) if (/(?:_KEY|_TOKEN|_SECRET|_PASSWORD)$|^N8N_|^CODEX_APP_TOOLS_PIPE_PATH$/i.test(key)) delete env[key];
  const cli = spawn(command, [...prefix, '--print', '--tools', '', '--disallowedTools', 'mcp__*', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--no-chrome', '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--no-session-persistence', '--session-id', nativeId, '--settings', path.join(root, '.claude/settings.json'), '--output-format', 'json', 'jadi Maya QA'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', bytes = 0; cli.stdout.on('data', b => { bytes += b.length; if (bytes > 2_000_000) cli.kill(); else output += b.toString(); }); cli.stderr.resume();
  const timer = setTimeout(() => cli.kill(), 90000); const [code] = await once(cli, 'exit'); clearTimeout(timer);
  if (code !== 0) throw Error('Native CLI/hook check failed; inspect project trust and hook compatibility, no owner data used.');
  const result = JSON.parse(output); if (result.is_error || !String(result.result).includes('Maya')) throw Error('Native Claude did not confirm the fixture role.');
  const context = await officeRequest({ action: 'hook', client: 'Claude', nativeId, event: 'start' }, { directory, port: new URL(url).port });
  if (!context.bound || context.role.name !== 'Maya QA') throw Error('Native session did not bind to fixture role.');
  const state = await (await fetch(url + '/api/state')).json();
  const check = { nativeId, role: context.role.name, client: context.client, hooksConfirmed: true, bound: context.bound, taskCount: state.tasks.length, decisionCount: state.decisions.length, revision: state.revision, syntheticOnly: true };
  await writeFile(path.join(directory, 'check.json'), JSON.stringify(check, null, 2)); console.log(JSON.stringify({ ...check, evidence: path.join(directory, 'check.json') }));
} finally { if (server.exitCode === null) { const ended = once(server, 'exit'); server.kill(); await ended; } clearAuth?.(); }
