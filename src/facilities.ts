export const serverAgent = { id: 'nate', name: 'Nate', role: 'Knowledge & Obsidian', divisionId: 'server', manager: false };

export const facilityLayouts = [
  { id: 'meeting-main', name: 'Meeting utama', kind: 'meeting', x: -12.8, z: -.65, width: 10.8, depth: 9, capacity: 8, description: 'Briefing dan review bersama manager. Agenda, peserta dan catatan tersimpan.' },
  { id: 'meeting-alt', name: 'Ruang medis', kind: 'medical', x: -12.8, z: 10.05, width: 10.8, depth: 7.6, capacity: 4, description: 'Empat tempat pemulihan agent. Pantau alasan error dan catat pemulihan; pekerjaan tidak dilanjutkan otomatis.' },
  { id: 'server', name: 'Ruang server', kind: 'server', x: 0, z: 18.05, width: 8.4, depth: 7.6, capacity: 0, description: 'Rak server, pendingin dan meja kontrol untuk pusat pengetahuan kantor. Koneksi Obsidian direncanakan; belum terhubung.' },
  { id: 'builder', name: 'Builder studio', kind: 'builder', x: 0, z: 9.05, width: 5.8, depth: 5.6, capacity: 0, description: 'Studio kompak satu orang, meja dan rak. Mengikuti diskusi Builder web atau sesi coding agent; bersantai saat luang dan kembali bekerja ketika giliran aktif.' },
  { id: 'lounge', name: 'AI Lounge', kind: 'lounge', x: -12.8, z: 21.45, width: 10.8, depth: 10.4, capacity: 4, description: 'Istirahat tim, coffee bar dan sudut baca. Kehadiran anggota tercatat.' },
  { id: 'garden', name: 'Taman luar', kind: 'garden', x: -10.8, z: -14.25, width: 10.8, depth: 10.4, capacity: 4, description: 'Taman di luar bangunan, dicapai melalui pintu belakang. Pergola, bangku dan area refleksi.' },
  { id: 'sport', name: 'Lapangan luar', kind: 'sport', x: 4, z: -14.25, width: 14, depth: 10.4, capacity: 4, description: 'Lapangan basket dan zona peregangan di luar kantor, tersambung ke taman lewat jalur pejalan kaki.' },
] as const;

export function facilitySeats(id: string) {
  const room = facilityLayouts.find(r => r.id === id);
  if (!room) return [];
  return Array.from({ length: room.capacity }, (_, i) => {
    if (room.kind === 'meeting') {
      const rows = room.capacity / 2, side = i < rows ? -1 : 1;
      const z = -.7 + (i % rows - (rows - 1) / 2) * 1.15;
      return { x: side * 2.05, z, heading: -side * Math.PI / 2, seated: true, height: .83, walkX: side * 3.05, walkZ: z, lying: false };
    }
    if (room.kind === 'medical') return { x: -3.6 + i * 2.4, z: .4, heading: 0, seated: false, lying: true, height: 1.26, walkX: -3.6 + i * 2.4, walkZ: 1.6 };
    if (room.kind === 'lounge') { const x = i < 2 ? -2.8 : 2.8, z = -.7 + (i % 2 ? .7 : -.7); return { x, z, heading: i < 2 ? Math.PI / 2 : -Math.PI / 2, seated: true, height: .97, walkX: x + (i < 2 ? 1 : -1), walkZ: z, lying: false }; }
    if (room.kind === 'garden') { const x = i < 2 ? -3.1 + i * 1.1 : 2.6 + (i - 2) * .9, z = i < 2 ? -2.2 : 2.3; return { x, z, heading: 0, seated: true, height: i < 2 ? .86 : .84, walkX: x, walkZ: z + 1, lying: false }; }
    return { x: -2.4 + i * 1.6, z: 2.5, heading: Math.PI, seated: false, height: .3, walkX: -2.4 + i * 1.6, walkZ: 2.5, lying: false };
  });
}
import type { State } from './domain';

export const coffeeSpot = { x: 2.1, z: -3.85, walkX: 2.1, walkZ: -3.85, heading: Math.PI, seated: false, lying: false, height: .3 };

export function medicalPatients(state: Pick<State, 'agents' | 'incidents'>) {
  return (state.incidents || []).filter(i => !i.resolvedAt).map(incident => ({ incident, agent: incident.agentId === serverAgent.id ? serverAgent : state.agents.find(a => a.id === incident.agentId)!, bedIndex: incident.bedIndex }));
}
