// Backup consistente e comparação sem imprimir conteúdo das conversas.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3001/api/v1';
const directory = path.resolve('.data/backups');
const upgradeId = process.env.UPGRADE_ID || 'i023';
if (!/^[a-z][a-z0-9-]{0,40}$/.test(upgradeId)) throw new Error('Identificador de atualização inválido.');
const manifestPath = path.join(directory, upgradeId + '-manifest.json');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const get = async suffix => { const response = await fetch(base + suffix); assert.ok(response.ok); return response.json(); };
async function snapshot() {
  const settings = await get('/settings');
  const { conversations } = await get('/conversations');
  const details = await Promise.all(conversations.map(c => get('/conversations/' + c.id)));
  const { sections } = await get('/sections');
  if (details.some(d => d.messages.some(m => m.status === 'streaming'))) throw new Error('Há uma geração ativa; não reiniciar.');
  return { settings: hash(settings), conversations: hash(conversations), sections: hash(sections.map(s => ({ ...s, pinned: !!s.pinned }))), details: hash(details), count: conversations.length, messages: details.reduce((total, d) => total + d.messages.length, 0) };
}
if (process.argv[2] === 'before') {
  fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(manifestPath)) throw new Error('Manifesto já existe; não sobrescrever.');
  const before = await snapshot();
  const backup = path.join(directory, 'pre-' + upgradeId + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite');
  const db = new DatabaseSync(path.resolve('data/codex-local.sqlite'), { readOnly: true });
  try { db.exec("VACUUM INTO '" + backup.replaceAll("'", "''") + "'"); } finally { db.close(); }
  fs.writeFileSync(manifestPath, JSON.stringify({ before, backup }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ backup, conversations: before.count, messages: before.messages }));
} else if (process.argv[2] === 'after') {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const after = await snapshot();
  assert.deepEqual(after, manifest.before);
  manifest.verifiedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ preserved: true, conversations: after.count, messages: after.messages }));
} else throw new Error('Use before ou after.');
