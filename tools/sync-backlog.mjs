import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scope = fs.readFileSync(path.join(root, 'docs/ESCOPO_FUNCIONAL.md'), 'utf8');
const progress = JSON.parse(fs.readFileSync(path.join(root, 'docs/progresso.json'), 'utf8'));
const owners = { CFG:'Terra Ollama / Plataforma', CHAT:'Terra Interface / Plataforma', IDE:'Terra Interface / Plataforma', EXE:'Terra Plataforma / Ollama', AGT:'Terra Ollama / Plataforma', GIT:'Terra Plataforma / Interface', EXT:'Terra Plataforma / Ollama', AUT:'Terra Plataforma / Ollama', WEB:'Terra Interface / Ollama', PC:'Terra Ollama / Plataforma', MED:'Terra Ollama / Interface', ART:'Terra Plataforma / Interface', OPS:'Gerente / equipe' };
const rows = scope.split(/\r?\n/).filter(line => /^\| [A-Z]+-\d+ \|/.test(line)).map(line => line.split('|').slice(1,-1).map(cell => cell.trim()));
if (new Set(rows.map(row=>row[0])).size !== rows.length) throw new Error('ID duplicado no escopo.');
const escape = value => String(value).replaceAll('|','/').replaceAll('\n',' ');
const lines = ['# Backlog rastreável', '', `Atualizado em ${progress.updatedAt}. Gerado por npm run roadmap:sync; estados editados em docs/progresso.json.`, '', `Total: ${rows.length} requisitos. Critérios e dependências permanecem no [catálogo funcional](ESCOPO_FUNCIONAL.md).`, '', '| ID | Requisito | Fase | Responsável | Estado | Evidência |', '| --- | --- | --- | --- | --- | --- |'];
for (const [id,title,phase] of rows) {
  const state = progress.requirements[id] || {};
  lines.push(`| ${id} | ${escape(title)} | ${phase} | ${escape(owners[id.split('-')[0]])} | ${escape(state.status || 'planejado')} | ${escape(state.evidence || '—')} |`);
}
fs.writeFileSync(path.join(root, 'docs/BACKLOG.md'), lines.join('\n')+'\n');
console.log(`Backlog atualizado: ${rows.length} requisitos.`);
