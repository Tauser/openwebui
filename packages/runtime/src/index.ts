export interface ToolCall { function: { name: string; arguments: Record<string, unknown> }; id?: string }
export interface RuntimeMessage { role: 'user' | 'assistant' | 'tool'; content: string; tool_calls?: ToolCall[]; tool_name?: string }
export interface ToolDefinition { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }
export interface Checkpoint { messages: RuntimeMessage[]; steps: number; pending?: ToolCall[] }
export interface ToolProvider { chat(model: string, messages: RuntimeMessage[], tools: ToolDefinition[], signal?: AbortSignal): Promise<RuntimeMessage> }
export type RuntimeResult = { status: 'complete' | 'cancelled' | 'max_steps' | 'error' | 'reconcile'; checkpoint: Checkpoint; error?: string };
export async function runToolLoop(options: { provider: ToolProvider; model: string; checkpoint: Checkpoint; tools: ToolDefinition[]; execute: (call: ToolCall, signal?: AbortSignal) => Promise<string>; save: (checkpoint: Checkpoint) => Promise<void>; maxSteps: number; signal?: AbortSignal; progress?: (event: string) => void }): Promise<RuntimeResult> {
  const state: Checkpoint = structuredClone(options.checkpoint);
  const result = (status: RuntimeResult['status'], error?: string): RuntimeResult => ({ status, checkpoint: state, ...(error ? { error } : {}) });
  if (state.pending?.length) return result('reconcile', 'Ferramenta interrompida requer reconciliação antes de retomar.');
  try {
    while (state.steps < options.maxSteps) {
      if (options.signal?.aborted) return result('cancelled');
      options.progress?.('model');
      const message = await options.provider.chat(options.model, state.messages, options.tools, options.signal);
      if (options.signal?.aborted) return result('cancelled');
      if (message.role !== 'assistant') throw new Error('Resposta do modelo inválida');
      state.steps++; state.messages.push(message);
      if (!message.tool_calls?.length) { await options.save(state); return result('complete'); }
      state.pending = message.tool_calls.slice(); await options.save(state);
      while (state.pending.length) {
        if (options.signal?.aborted) return result('cancelled');
        const call = state.pending[0];
        if (!options.tools.some(t => t.function.name === call.function?.name)) throw new Error('Ferramenta não autorizada');
        options.progress?.(`tool:${call.function.name}`);
        const output = await options.execute(call, options.signal);
        state.messages.push({ role: 'tool', tool_name: call.function.name, content: output });
        state.pending.shift(); await options.save(state);
      }
      delete state.pending; await options.save(state);
    }
    return result('max_steps', 'Limite de etapas atingido');
  } catch (error) { return result(options.signal?.aborted ? 'cancelled' : 'error', error instanceof Error ? error.message : String(error)); }
}
export class OllamaToolProvider implements ToolProvider {
  private readonly base: URL;
  constructor(url: string) { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('URL inválida'); parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/'; this.base = parsed; }
  async chat(model: string, messages: RuntimeMessage[], tools: ToolDefinition[], signal?: AbortSignal): Promise<RuntimeMessage> {
    const response = await fetch(new URL('api/chat', this.base), { method: 'POST', headers: { 'content-type': 'application/json' }, signal, body: JSON.stringify({ model, messages, tools, stream: false, think: false, options: { num_ctx: 4096, num_predict: 512 } }) });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const data = await response.json() as { message?: RuntimeMessage; error?: string; done?: boolean };
    if (data.error) throw new Error(data.error);
    if (!data.done || !data.message || data.message.role !== 'assistant' || typeof data.message.content !== 'string') throw new Error('Resposta Ollama inválida');
    return data.message;
  }
}
