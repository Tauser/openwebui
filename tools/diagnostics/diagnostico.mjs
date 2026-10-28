import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const exec = promisify(execFile);
const dir = path.dirname(fileURLToPath(import.meta.url));
const command = async (file, args) => { try { return (await exec(file, args, { timeout: 5000, windowsHide: true, maxBuffer: 1024 * 1024 })).stdout.trim(); } catch { return null; } };
const endpoint = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
let ollama = { url: '(URL inválida)', connected: false, models: [], error: null };
try {
  const u = new URL(endpoint);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error('URL inválida');
  u.pathname = u.pathname.replace(/\/+$/, '') + '/';
  ollama.url = u.toString();
  const versionResponse = await fetch(new URL('api/version', u), { signal: AbortSignal.timeout(5000) });
  if (!versionResponse.ok) throw new Error(`HTTP ${versionResponse.status}`);
  const version = await versionResponse.json();
  const modelsResponse = await fetch(new URL('api/tags', u), { signal: AbortSignal.timeout(5000) });
  if (!modelsResponse.ok) throw new Error(`HTTP ${modelsResponse.status}`);
  const tags = await modelsResponse.json();
  if (typeof version.version !== 'string' || !Array.isArray(tags.models)) throw new Error('Resposta inválida');
  ollama = { ...ollama, connected: true, version: version.version, models: tags.models.map(m => m.name).filter(n => typeof n === 'string') };
} catch (e) { ollama.error = e instanceof Error ? e.message : String(e); }
const gpu = process.platform === 'win32' ? await command('powershell.exe', ['-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name']) : await command('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader']);
const codexVersion = await command(process.platform === 'win32' ? 'cmd.exe' : 'codex', process.platform === 'win32' ? ['/d', '/s', '/c', 'codex --version'] : ['--version']);
const data = { generatedAt: new Date().toISOString(), node: process.version, platform: os.platform(), architecture: os.arch(), ramBytes: os.totalmem(), gpu, ollama, codexVersion, compatibility: 'Compatibilidade integral não comprovada: streaming e cancelamento com modelo real não foram executados.' };
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'ambiente.json'), JSON.stringify(data, null, 2) + '\n');
let inference;
try { inference = JSON.parse(await readFile(path.join(dir, 'inferencia.json'), 'utf8')); } catch { inference = null; }
const inferenceReport = inference ? '\n## Inferência local real\n\nProbe: ' + inference.timestamp + ', modelo ' + inference.model + ', HTTP ' + (inference.httpStatus ?? 'indisponível') + ', sucesso ' + inference.success + ', duração ' + inference.elapsedMs + ' ms. Veja inferencia.json. Streaming e cancelamento reais permanecem pendentes. Codex CLI disponível não comprova integração app-server. A Fase 0 não está aceita com esta evidência isolada.\n' : '';
await writeFile(path.join(dir, 'ambiente.md'), `# Diagnóstico local\n\nGerado em ${data.generatedAt}. Execute novamente com \`node tools/diagnostics/diagnostico.mjs\`.\n\n- Node: ${data.node} (${data.platform}/${data.architecture})\n- RAM total: ${(data.ramBytes / 1024 ** 3).toFixed(1)} GiB\n- GPU: ${gpu || 'não detectada'}\n- Codex: ${codexVersion || 'não detectado'}\n- Ollama: ${ollama.connected ? `conectado (${ollama.version})` : `indisponível (${ollama.error})`}\n- Modelos: ${ollama.models.length ? ollama.models.join(', ') : 'nenhum detectado'}\n\n${inference ? inferenceReport : data.compatibility + " A Fase 0 não está aceita com esta evidência isolada."}\n`);
console.log(JSON.stringify(data, null, 2));




