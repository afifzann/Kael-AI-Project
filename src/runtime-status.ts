import type { AgentProvider, State } from './domain';

export const runnableProviders: AgentProvider[] = ['Codex', 'Claude'];
export type RuntimeConnection = { available: boolean; label: string; reason: string };
export type RuntimeInfo = RuntimeConnection & { providers?: Partial<Record<AgentProvider, RuntimeConnection>>; executing: string[] };
export function runtimeFor(s: Pick<State, 'aiRuntime'>, provider: string) {
  return s.aiRuntime?.providers?.[provider as AgentProvider] || (provider === 'Codex' && !s.aiRuntime?.providers ? s.aiRuntime : undefined);
}
