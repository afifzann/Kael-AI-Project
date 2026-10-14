import type { State } from './domain';
import { facilityLayouts, serverAgent } from './facilities.ts';
import { agentActivity } from './visuals.ts';
import { builderAgent } from './builder-room.ts';

// Ambient visits never create conversations, sessions or work in the persisted state.
export function socialVisit(state: State, cycle: number, visits: { agentId: string; roomId: string }[] = []) {
  const idle = [...state.agents, serverAgent, builderAgent].filter(a => agentActivity(state, a).canWalk && !visits.some(v => v.agentId === a.id));
  const rooms = facilityLayouts.filter(r => ['lounge', 'garden', 'sport'].includes(r.kind) && !visits.some(v => v.roomId === r.id) && !state.facilitySessions?.some(s => s.roomId === r.id && s.status === 'active'));
  if (!idle.length || !rooms.length) return null;
  const room = rooms[cycle % rooms.length];
  const participants = [idle[cycle % idle.length], ...(idle.length > 1 ? [idle[(cycle + 1) % idle.length]] : [])];
  return { roomId: room.id, participantIds: participants.map(a => a.id), seatIndices: room.kind === 'lounge' ? [0, 2] : [0, 1] };
}

// A visual practice loop, not an autonomous AI game or a physics simulation.
export function courtPlay(time: number, players: { x: number; z: number }[]) {
  if (!players.length) return null;
  const tick = Math.max(0, time), playerIndex = Math.floor(tick / 6) % players.length, phase = tick % 6;
  const player = players[playerIndex], next = players[(playerIndex + 1) % players.length];
  const hand = { x: player.x - .45, z: player.z - .35 };
  if (phase < 2) return { ...hand, y: .53 + Math.abs(Math.sin(phase * Math.PI * 2)) * .72, playerIndex, action: 'dribble' as const };
  if (phase < 2.6) return { ...hand, y: .53 + (phase - 2) / .6 * 1.07, playerIndex, action: 'shoot' as const };
  if (phase < 3.8) { const t = (phase - 2.6) / 1.2; return { x: hand.x + (-1.3 - hand.x) * t, z: hand.z + (-4.35 - hand.z) * t, y: 1.6 + .95 * t + 7 * t * (1 - t), playerIndex, action: 'flight' as const }; }
  if (phase < 4.3) return { x: -1.3, z: -4.35, y: 2.55 - (phase - 3.8) / .5 * 2.02, playerIndex, action: 'flight' as const };
  const t = (phase - 4.3) / 1.7;
  return { x: -1.3 + (next.x - .45 + 1.3) * t, z: -4.35 + (next.z - .35 + 4.35) * t, y: .53 + Math.sin(t * Math.PI) * .9, playerIndex, action: 'return' as const };
}

export function advanceTravel(distance: number, speed: number, length: number, returning: boolean, dt: number) {
  const step = Math.max(0, Math.min(.05, dt)), remaining = returning ? distance : length - distance;
  const target = Math.min(1.55, .18 + remaining * 1.3) * (returning ? -1 : 1);
  const nextSpeed = speed + (target - speed) * (1 - Math.exp(-3.5 * step));
  return { distance: Math.max(0, Math.min(length, distance + nextSpeed * step)), speed: nextSpeed };
}
