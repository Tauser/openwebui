import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const started = Date.now();
const evidence = { timestamp: new Date().toISOString(), model: 'qwen3.5-9b-coder:latest', endpoint: 'http://127.0.0.1:11434/api/chat', options: { num_predict: 32, num_ctx: 4096 }, think: false, keep_alive: '1m', success: false };
try {
  const response = await fetch(evidence.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(120000), body: JSON.stringify({ model: evidence.model, messages: [{ role: 'user', content: 'Responda apenas: OK' }], stream: false, think: false, options: evidence.options, keep_alive: evidence.keep_alive }) });
  evidence.httpStatus = response.status;
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error || `HTTP ${response.status}`);
  evidence.response = body.message?.content || '';
  evidence.done = body.done === true;
  evidence.doneReason = body.done_reason;
  evidence.success = evidence.done && evidence.response.trim().length > 0;
  if (!evidence.success) evidence.error = 'Sem conteúdo ou confirmação de conclusão';
} catch (error) { evidence.error = error instanceof Error ? error.message : String(error); }
evidence.elapsedMs = Date.now() - started;
await writeFile(fileURLToPath(new URL('inferencia.json', import.meta.url)), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.success) process.exitCode = 1;
