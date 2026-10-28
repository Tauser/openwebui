import { mkdir, realpath, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runToolLoop, OllamaToolProvider } from '../../packages/runtime/dist/index.js';
const data = path.resolve('.data');
if (await realpath(data) !== path.join(await realpath('.'), '.data')) throw new Error('Diretório .data fora do workspace');
const dir = path.join(data, 'runtime-resume-probe');
try { await mkdir(dir); } catch { throw new Error('Fixture já existe; não será sobrescrita.'); }
const prior = JSON.parse(await readFile(path.join(data, 'runtime-probe', 'checkpoint.json'), 'utf8'));
if (prior.messages.at(-1)?.role !== 'assistant' || prior.steps !== 3) throw new Error('Checkpoint da prova anterior inesperado');
const checkpoint = { messages: prior.messages.slice(0, -1), steps: prior.steps - 1 };
const checkpointPath = path.join(dir, 'checkpoint.json');
await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), { flag: 'wx' });
const baseProvider = new OllamaToolProvider('http://127.0.0.1:11434');
const tools = [
  { type:'function', function:{ name:'read_file', description:'Lê arquivo da fixture.', parameters:{type:'object',properties:{path:{type:'string'}},required:['path']} } },
  { type:'function', function:{ name:'write_file', description:'Substitui conteúdo da fixture.', parameters:{type:'object',properties:{path:{type:'string'},content:{type:'string'}},required:['path','content']} } },
  { type:'function', function:{ name:'run_test', description:'Executa teste fixo.', parameters:{type:'object',properties:{}} } }
];
const save = async s => writeFile(checkpointPath, JSON.stringify(s, null, 2));
const execute = async () => { throw new Error('Prova de retomada não permite executar ferramentas'); };
let callStarted = false; const controller = new AbortController();
const provider = { chat: (...args) => { callStarted = true; const promise = baseProvider.chat(...args); setTimeout(() => controller.abort(), 250); return promise; } };
const started = Date.now();
const cancelled = await runToolLoop({ provider, model:'qwen3.5-9b-coder:latest', checkpoint, tools, execute, save, maxSteps:8, signal:controller.signal });
const persisted = JSON.parse(await readFile(checkpointPath, 'utf8'));
const timeout = AbortSignal.timeout(180000);
let resumed = {status:'not_run'};
if (cancelled.status === 'cancelled' && callStarted && !persisted.pending?.length) resumed = await runToolLoop({ provider:baseProvider, model:'qwen3.5-9b-coder:latest', checkpoint:persisted, tools, execute, save, maxSteps:8, signal:timeout });
const pending = { ...checkpoint, pending:[{function:{name:'write_file', arguments:{path:'sum.mjs',content:'x'}}}] };
const reconciliation = await runToolLoop({ provider:baseProvider, model:'qwen3.5-9b-coder:latest', checkpoint:pending, tools, execute, save, maxSteps:8 });
const evidence = { model:'qwen3.5-9b-coder:latest', startedAt:new Date(started).toISOString(), callStarted, cancelled:cancelled.status, cancelledError:cancelled.error, persistedSteps:persisted.steps, persistedPending:!!persisted.pending?.length, resumed:resumed.status, resumedError:resumed.error, resumedSteps:resumed.checkpoint?.steps, reconciliation:reconciliation.status, elapsedMs:Date.now()-started };
await writeFile(path.join(dir,'evidence.json'), JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
if (!callStarted || cancelled.status !== 'cancelled' || resumed.status !== 'complete' || reconciliation.status !== 'reconcile') process.exitCode = 1;
