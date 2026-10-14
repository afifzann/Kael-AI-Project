import * as THREE from 'three';
import type { characterLook } from './visuals';
import { builderActivity, type BuilderPresence } from './builder-room.ts';

export function createMonitor(look: ReturnType<typeof characterLook>, manager: boolean, session?: { title: string }) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const titles = { knowledge: 'OBSIDIAN / GRAPH VIEW', trading: 'MARKET / CHART', design: 'DESIGN / CANVAS', content: 'CONTENT / STUDIO', code: 'DEVELOPMENT', research: 'RESEARCH / NOTES', tasks: 'WORKSPACE / TASKS' };
  function text(value: string, x: number, y: number, color = '#f1e7d8', size = 15) { ctx.fillStyle = color; ctx.font = `${size}px sans-serif`; ctx.fillText(value, x, y, 465); }
  function draw(time: number, task = '', workflow?: { name: string; status: string; checkedAt: string; executions: string[] }, presence?: BuilderPresence) {
    ctx.fillStyle = '#2d2925'; ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = '#30302c'; ctx.fillRect(0, 0, 512, 44);
    if (session) {
      text('BUILDER / CODEX', 20, 28, '#f3efe0', 17);
      text(session.title, 24, 102, '#d4af37', 30);
      text('Diskusi  /  Rencana  /  Build', 24, 157, '#f3efe0', 20);
      text(builderActivity(presence).text, 24, 211, '#b8ad9e', 17);
      text('SESI BUILDER / CODEX', 20, 305, '#b8ad9e', 13);
      texture.needsUpdate = true; return;
    }
    if (workflow) {
      text('N8N / WORKFLOW MONITOR', 20, 28, '#fbf4e8', 17);
      text(workflow.name, 20, 70, '#c9bba8', 14);
      text(workflow.status, 20, 115, '#dcc5a1', 22);
      workflow.executions.slice(0, 4).forEach((entry, i) => text(entry, 20, 158 + i * 29, '#f1e7d8', 15));
      text('POLLING / ' + (workflow.checkedAt ? new Date(workflow.checkedAt).toLocaleTimeString('id-ID') : 'MENUNGGU KONEKSI'), 20, 305, '#c9bba8', 12);
      texture.needsUpdate = true; return;
    }
    text(manager ? 'MANAGER / TEAM OVERVIEW' : titles[look.theme], 20, 28, '#fbf4e8', 17);
    text(look.theme === 'knowledge' ? 'CONTOH GRAPH · VAULT BELUM TERHUBUNG' : 'DEMO VISUAL · BUKAN DATA LIVE', 20, 305, '#c9bba8', 12);
    text(task || (look.theme === 'knowledge' ? 'Nate / Menunggu koneksi vault' : manager ? 'Planning  /  Review  /  Handoff' : 'Local workspace preview'), 20, 69, '#c9bba8', 13);
    if (look.theme === 'knowledge') {
      const nodes = Array.from({ length: 22 }, (_, i) => {
        const angle = i * 2.39996, radius = i ? 24 + Math.sqrt(i) * 19 : 0;
        return { x: 265 + Math.cos(angle) * radius * 1.6, y: 183 + Math.sin(angle) * radius * .78 };
      });
      ctx.strokeStyle = '#766d9b'; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      nodes.slice(1).forEach((node, i) => { const other = nodes[i % 4]; ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(other.x, other.y); ctx.stroke(); });
      ctx.globalAlpha = 1;
      nodes.forEach((node, i) => { ctx.fillStyle = i % 4 ? '#b6afcf' : '#dcc4ef'; ctx.beginPath(); ctx.arc(node.x, node.y, i ? 3 : 7, 0, Math.PI * 2); ctx.fill(); });
    } else if (look.theme === 'trading') {
      ctx.strokeStyle = '#66503d'; ctx.lineWidth = 1;
      for (let y = 100; y < 270; y += 35) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(490, y); ctx.stroke(); }
      for (let i = 0; i < 22; i++) {
        const mid = 196 - Math.sin(i * .65 + look.seed % 9) * 35 - i * 1.3;
        const h = 10 + (i * 7 % 25), x = 30 + i * 21;
        ctx.fillStyle = i % 4 ? '#a0c698' : '#d29478';
        ctx.fillRect(x, mid - h / 2 - 9, 2, h + 18); ctx.fillRect(x - 5, mid - h / 2, 12, h);
        ctx.globalAlpha = .4; ctx.fillRect(x - 5, 276 - h / 2, 12, h / 2); ctx.globalAlpha = 1;
      }
      text('SAMPLE CHART', 354, 104, '#c6d6b5', 12);
    } else if (look.theme === 'design') {
      ctx.fillStyle = '#faf9f5'; ctx.fillRect(120, 89, 280, 186);
      ctx.fillStyle = '#ab9b85'; ctx.beginPath(); ctx.arc(240, 170, 57, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#926b47'; ctx.fillRect(261, 153, 78, 91);
      text('KAEL', 166, 242, '#30302c', 29);
      ['#ab9b85', '#926b47', '#faf9f5'].forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(25, 103 + i * 42, 28, 28); });
    } else if (look.theme === 'content') {
      ctx.fillStyle = '#c9bba8'; ctx.fillRect(20, 87, 272, 125);
      ctx.fillStyle = '#66503d'; ctx.beginPath(); ctx.moveTo(135, 120); ctx.lineTo(135, 180); ctx.lineTo(180, 150); ctx.fill();
      text('SCRIPT / OUTLINE', 315, 104, '#d5e2cc', 12);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ab9b85'; ctx.fillRect(315, 118 + i * 17, 140 - i % 3 * 23, 5); }
      for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#b08b6c' : '#86a9c8'; ctx.fillRect(20 + i * 67, 233, 60, 25); }
      ctx.fillStyle = '#ecddae'; ctx.fillRect(20 + time * 12 % 440, 222, 2, 48);
    } else {
      text(look.theme === 'code' ? 'src / project.ts' : manager ? 'TEAM QUEUE' : 'WORK NOTES', 26, 101, '#d2c49c', 15);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = ['#88ad97', '#b3bfa0', '#c29a7c'][i % 3];
        ctx.fillRect(26 + (look.theme === 'code' ? i % 3 * 20 : 0), 118 + i * 19, 180 + ((i * 43 + look.seed) % 200), 6);
      }
      if (Math.floor(time * 2) % 2 === 0) { ctx.fillStyle = '#dfd8b8'; ctx.fillRect(240, 248, 3, 16); }
    }
    texture.needsUpdate = true;
  }
  draw(0);
  return { texture, draw };
}
