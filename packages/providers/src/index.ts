import type { Message, MessageAttachment, ModelInfo, ModelRecommendations, OllamaChatMessage, OllamaChatRequest } from '@codex-local/contracts';

/** Keep attachments in the message that introduced them, including prior turns. */
export function prepareAttachmentMessages(messages: Array<Pick<Message, 'role' | 'content' | 'attachments'>>, systemPrompt: string): OllamaChatMessage[] {
  const result: OllamaChatMessage[] = systemPrompt ? [{ role: 'system', content: systemPrompt }] : [];
  for (const message of messages) {
    const textParts = (message.attachments ?? []).filter(a => a.kind === 'text' && typeof a.text === 'string')
      .map(a => `\n\n[Anexo de texto: ${JSON.stringify(a.name)}]\n${a.text}\n[Fim do anexo de texto]`);
    const images = (message.attachments ?? []).filter(a => a.kind === 'image' && typeof a.data === 'string').map(a => a.data as string);
    result.push({ role: message.role, content: message.content + textParts.join(''), ...(images.length ? { images } : {}) });
  }
  return result;
}

/** Conservative heuristic, not an exact token count: one token per UTF-8 byte,
 * 64 tokens per message and one per 256 image pixels. Unknown dimensions
 * reserve the maximum accepted image area; output retains 25% or 512 tokens. */
export function estimateAttachmentContext(messages: OllamaChatMessage[], attachments: MessageAttachment[], numCtx: number): { estimatedTokens: number; inputBudget: number; fits: boolean } {
  const encoder = new TextEncoder();
  const text = messages.reduce((sum, message) => sum + encoder.encode(message.content).length + 64, 0);
  const images = attachments.filter(a => a.kind === 'image').reduce((sum, a) => {
    const pixels = Number.isSafeInteger(a.width) && Number.isSafeInteger(a.height) && (a.width ?? 0) > 0 && (a.height ?? 0) > 0 ? a.width! * a.height! : 16 * 1024 * 1024;
    return sum + Math.ceil(pixels / 256) + 256;
  }, 0);
  const estimatedTokens = text + images;
  const inputBudget = Number.isFinite(numCtx) && numCtx > 0 ? Math.max(0, Math.floor(numCtx) - Math.max(512, Math.ceil(numCtx * 0.25))) : 0;
  return { estimatedTokens, inputBudget, fits: estimatedTokens <= inputBudget };
}

/** Local Ollama HTTP adapter. No credentials or cloud fallback are accepted. */
export class OllamaClient {
  private readonly baseUrl: URL;

  constructor(baseUrl: string) {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('A URL do Ollama deve usar HTTP(S), sem credenciais, consulta ou fragmento.');
    }
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
    this.baseUrl = url;
  }

  private endpoint(path: string): URL { return new URL(path, this.baseUrl); }

  async health(signal?: AbortSignal): Promise<{ connected: boolean; error?: string }> {
    try {
      const response = await fetch(this.endpoint('api/version'), { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)].filter((s): s is AbortSignal => !!s)) });
      if (!response.ok) throw new Error(`Ollama respondeu HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || typeof (data as { version?: unknown }).version !== 'string') throw new Error('Resposta de versão inválida');
      return { connected: true };
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      return { connected: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    const response = await fetch(this.endpoint('api/tags'), { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)].filter((s): s is AbortSignal => !!s)) });
    if (!response.ok) throw new Error(`Ollama respondeu HTTP ${response.status}`);
    const data = await response.json() as { models?: Array<{ name?: unknown; size?: unknown; modified_at?: unknown; details?: { family?: unknown; parameter_size?: unknown; quantization_level?: unknown } }> };
    if (!Array.isArray(data.models)) throw new Error('Lista de modelos inválida');
    return data.models.map((model) => {
      if (typeof model.name !== 'string' || typeof model.size !== 'number' || typeof model.modified_at !== 'string') throw new Error('Modelo inválido na resposta do Ollama');
      return { name: model.name, size: model.size, modifiedAt: model.modified_at,
        ...(typeof model.details?.family === 'string' ? { family: model.details.family } : {}),
        ...(typeof model.details?.parameter_size === 'string' ? { parameterSize: model.details.parameter_size } : {}),
        ...(typeof model.details?.quantization_level === 'string' ? { quantization: model.details.quantization_level } : {}) };
    });
  }

  async recommendations(model: string, signal?: AbortSignal): Promise<ModelRecommendations> {
    const response = await fetch(this.endpoint('api/show'), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)].filter((s): s is AbortSignal => !!s))
    });
    if (!response.ok) throw new Error(`Ollama não conseguiu consultar o modelo (HTTP ${response.status})`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Metadados do modelo inválidos');
    const obj = data as Record<string, unknown>;
    const parameters = typeof obj.parameters === 'string' ? obj.parameters : '';
    const parseParameter = (name: string): number | null => {
      let result: number | null = null;
      for (const line of parameters.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        if (parts[0]?.toLowerCase() === name && parts.length === 2 && parts[1]) {
          const n = Number(parts[1]);
          if (Number.isFinite(n)) result = n;
        }
      }
      return result;
    };
    const info = obj.model_info && typeof obj.model_info === 'object' && !Array.isArray(obj.model_info) ? obj.model_info as Record<string, unknown> : {};
    const validLimit = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
    const architecture = typeof info['general.architecture'] === 'string' ? info['general.architecture'] : '';
    const preferred = info[`${architecture}.context_length`];
    const fallback = Object.entries(info).filter(([key, value]) => key.endsWith('.context_length') && validLimit(value)).sort(([a], [b]) => a.localeCompare(b));
    const contextLimit = validLimit(preferred) ? preferred : fallback.length ? fallback[0][1] as number : null;
    const rawCtx = parseParameter('num_ctx');
    const numCtx = rawCtx !== null && Number.isSafeInteger(rawCtx) && rawCtx > 0 ? (contextLimit === null ? rawCtx : Math.min(rawCtx, contextLimit)) : null;
    const temperature = parseParameter('temperature');
    const capsKnown = Array.isArray(obj.capabilities);
    const capabilities = capsKnown ? (obj.capabilities as unknown[]).filter((value): value is string => typeof value === 'string') : [];
    const thinking = obj.thinking && typeof obj.thinking === 'object' && !Array.isArray(obj.thinking) ? obj.thinking as Record<string, unknown> : null;
    const isThinkingValue = (value: unknown): value is boolean | string => typeof value === 'boolean' || typeof value === 'string';
    let modelSizeBytes: number | undefined;
    try {
      const match = (await this.listModels(signal)).find(item => item.name === model);
      if (match && Number.isSafeInteger(match.size) && match.size > 0) modelSizeBytes = match.size;
    } catch (error) { if (signal?.aborted) throw error; }
    const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
    const layers = info[`${architecture}.block_count`];
    const heads = info[`${architecture}.attention.head_count_kv`];
    const totalHeads = positive(layers) && positive(heads) ? layers * heads :
      positive(layers) && Array.isArray(heads) && heads.length === layers && heads.every(n => Number.isSafeInteger(n) && n >= 0)
        ? heads.reduce((sum: number, n: number) => sum + n, 0) : null;
    const attentionHeads = info[`${architecture}.attention.head_count`];
    const embedding = info[`${architecture}.embedding_length`];
    const derivedLength = positive(embedding) && positive(attentionHeads) && embedding % attentionHeads === 0 ? embedding / attentionHeads : null;
    const keyValue = info[`${architecture}.attention.key_length`];
    const valueValue = info[`${architecture}.attention.value_length`];
    const keyLength = positive(keyValue) ? keyValue : derivedLength;
    const valueLength = positive(valueValue) ? valueValue : derivedLength;
    const kvBytes = totalHeads !== null && totalHeads > 0 && keyLength !== null && valueLength !== null ? 2 * (keyLength + valueLength) * totalHeads : null;
    return { model, temperature, numCtx, contextLimit,
      ...(modelSizeBytes !== undefined ? { modelSizeBytes } : {}),
      ...(kvBytes !== null && Number.isSafeInteger(kvBytes) && kvBytes > 0 ? { kvBytesPerToken: kvBytes } : {}),
      think: isThinkingValue(thinking?.default) ? thinking.default : null,
      thinkingValues: Array.isArray(thinking?.values) ? thinking.values.filter(isThinkingValue) : [],
      thinkingSupported: thinking ? true : capsKnown ? capabilities.includes('thinking') : null,
      capabilities, source: 'ollama' };
  }

  async runningModels(signal?: AbortSignal): Promise<Array<{ name: string; size: number; sizeVram: number; contextLength?: number }>> {
    const response = await fetch(this.endpoint('api/ps'), { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)].filter((s): s is AbortSignal => !!s)) });
    if (!response.ok) throw new Error(`Ollama não conseguiu listar modelos residentes (HTTP ${response.status})`);
    const data = await response.json() as { models?: unknown };
    if (!Array.isArray(data.models)) throw new Error('Lista de modelos residentes inválida');
    return data.models.map((item: unknown) => {
      if (!item || typeof item !== 'object') throw new Error('Modelo residente inválido');
      const entry = item as Record<string, unknown>;
      if (typeof entry.name !== 'string' || typeof entry.size !== 'number' || typeof entry.size_vram !== 'number') throw new Error('Modelo residente inválido');
      return { name: entry.name, size: entry.size, sizeVram: entry.size_vram,
        ...(typeof entry.context_length === 'number' && Number.isSafeInteger(entry.context_length) && entry.context_length > 0 ? { contextLength: entry.context_length } : {}) };
    });
  }

  async *chat(request: OllamaChatRequest): AsyncGenerator<string> {
    const controller = new AbortController();
    const signal = request.signal ? AbortSignal.any([request.signal, controller.signal]) : controller.signal;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetch(this.endpoint('api/chat'), {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal,
        body: JSON.stringify({ model: request.model, messages: request.messages, stream: true, ...(request.think !== undefined ? { think: request.think } : {}),
          options: { ...(request.temperature !== undefined ? { temperature: request.temperature } : {}), ...(request.numCtx !== undefined ? { num_ctx: request.numCtx } : {}) } })
      });
      if (!response.ok) {
        const body = await response.text();
        let message = `Ollama respondeu HTTP ${response.status}`;
        try { const parsed = JSON.parse(body) as { error?: unknown }; if (typeof parsed.error === 'string') message = parsed.error; } catch { /* retain status */ }
        throw new Error(message);
      }
      if (!response.body) throw new Error('Resposta de streaming vazia');
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      const parse = (line: string): string | undefined => {
        if (!line.trim()) return undefined;
        const event = JSON.parse(line) as { error?: unknown; message?: { content?: unknown }; done?: unknown };
        if (typeof event.error === 'string') throw new Error(event.error);
        if (event.done === true) done = true;
        if (event.message?.content !== undefined && typeof event.message.content !== 'string') throw new Error('Conteúdo de streaming inválido');
        return event.message?.content as string | undefined;
      };
      while (true) {
        const part = await reader.read();
        buffer += decoder.decode(part.value, { stream: !part.done });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          const content = parse(line); if (content) yield content; if (done) return;
        }
        if (part.done) break;
      }
      if (buffer.trim()) { const content = parse(buffer); if (content) yield content; }
      if (!done) throw new Error('Streaming do Ollama terminou antes da confirmação de conclusão');
    } finally {
      controller.abort();
      if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
  }
}



