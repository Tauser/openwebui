import { mkdir, writeFile, readFile, lstat, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { runToolLoop, OllamaToolProvider } from '../../packages/runtime/dist/index.js';
const root = path.resolve('.data/runtime-probe');
await mkdir(path.dirname(root), { recursive: true });
if (await realpath(path.dirname(root)) !== path.join(await realpath('.'), '.data')) throw new Error('Diretório .data deve estar no workspace e não pode ser junction.');
try { await mkdir(root); } catch { throw new Error('Fixture já existe; não será sobrescrita automaticamente.'); }
const rootReal = await realpath(root);
await writeFile(path.join(root, 'sum.mjs'), 'export function sum(a, b) { return a - b; }\n', { flag: 'wx' });
await writeFile(path.join(root, 'sum.test.mjs'), "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { sum } from './sum.mjs';\ntest('sum', () => assert.equal(sum(1, 2), 1));\n", { flag: 'wx' });
const paths = new Set(['sum.mjs', 'sum.test.mjs']);
async function checked(name) {
  if (typeof name !== 'string' || !paths.has(name)) throw new Error('Arquivo fora da fixture');
  const file = path.join(rootReal, name); const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || path.dirname(await realpath(file)) !== rootReal) throw new Error('Caminho não seguro');
  return file;
}
const tools = [
  { type:'function', function:{ name:'read_file', description:'Lê arquivo da fixture.', parameters:{ type:'object', properties:{ path:{type:'string'} }, required:['path'] } } },
  { type:'function', function:{ name:'write_file', description:'Substitui conteúdo de arquivo da fixture.', parameters:{ type:'object', properties:{ path:{type:'string'}, content:{type:'string'} }, required:['path','content'] } } },
  { type:'function', function:{ name:'run_test', description:'Executa apenas o teste fixo da fixture.', parameters:{ type:'object', properties:{} } } }
];
const log = []; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 180000);
const execute = async (call, signal) => {
  const { name, arguments: args } = call.function; log.push(name);
  try {
    if (signal?.aborted) throw signal.reason;
    if (name === 'read_file') return await readFile(await checked(args.path), 'utf8');
    if (name === 'write_file') { if (typeof args.content !== 'string' || args.content.length > 20000) throw new Error('Conteúdo inválido'); await writeFile(await checked(args.path), args.content); return 'Arquivo atualizado.'; }
    if (name === 'run_test') { const source = await readFile(await checked('sum.mjs'), 'utf8'); const test = await readFile(await checked('sum.test.mjs'), 'utf8'); const sources = ['export function sum(a, b) { return a + b; }', 'export function sum(a, b) { return a - b; }']; const tests = [1,3].map(n => `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { sum } from './sum.mjs';\ntest('sum', () => assert.equal(sum(1, 2), ${n}));`); if (!sources.includes(source.trim()) || !tests.includes(test.trim())) throw new Error('Teste não executado: conteúdo fora do formato seguro da fixture'); const result = await promisify(execFile)(process.execPath, ['--test','sum.test.mjs'], { cwd: rootReal, timeout: 10000, signal, windowsHide: true }); return result.stdout + result.stderr; }
    throw new Error('Ferramenta não autorizada');
  } catch (e) { if (signal?.aborted) throw e; return `Falha: ${e.message}\n${e.stdout || ''}\n${e.stderr || ''}`; }
};
const checkpointPath = path.join(rootReal, 'checkpoint.json');
const state = { messages:[{role:'user',content:'Na fixture, leia sum.mjs e sum.test.mjs. Corrija os DOIS arquivos: sum deve somar, e o teste deve verificar que sum(1, 2) é 3. Use write_file para os dois arquivos e execute run_test. Não use outras ferramentas.'}], steps:0 };
const started = Date.now();
const result = await runToolLoop({ provider:new OllamaToolProvider('http://127.0.0.1:11434'), model:'qwen3.5-9b-coder:latest', checkpoint:state, tools, execute, save: async state => writeFile(checkpointPath, JSON.stringify(state,null,2)), maxSteps:12, signal:controller.signal, progress:event=>console.log(event) });
clearTimeout(timer);
const evidence = { status:result.status, steps:result.checkpoint.steps, error:result.error, toolCalls:log, elapsedMs:Date.now()-started };
await writeFile(path.join(rootReal,'evidence.json'),JSON.stringify(evidence,null,2)); console.log(JSON.stringify(evidence));


