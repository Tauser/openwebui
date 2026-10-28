import { Store } from '../../apps/server/dist/store.js';
import fs from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
const directory = path.resolve(process.env.QA_DATA_DIR || '.data/qa-attachments');
if (!directory.startsWith(path.resolve('.data') + path.sep)) throw new Error('Use uma fixture dentro de .data/.');
if (fs.existsSync(path.join(directory, 'codex-local.sqlite'))) throw new Error('A fixture existente não será sobrescrita.');
const store = new Store(directory);
store.saveSettings({ ...store.settings(), model: 'qwen3.5-9b-coder:latest', followModelDefaults: false, numCtx: 4096, think: false, theme: 'dark' });
const alpha = store.create('QA Anexos');
const beta = store.create('QA Outro');
store.addMessage(beta.conversation.id, 'user', 'Conversa de verificação de rascunhos.', 'complete');
store.addMessage(beta.conversation.id, 'assistant', 'Conteúdo da fixture.', 'complete');
store.close();
function crc32(bytes) { let crc = 0xffffffff; for (const b of bytes) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(name, data) { const type = Buffer.from(name); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data]))); return Buffer.concat([length, type, data, crc]); }
const width = 192, height = 128, raw = Buffer.alloc(height * (1 + width * 3));
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = y * (1 + width * 3) + 1 + x * 3; raw[i] = 235; raw[i + 1] = 20; raw[i + 2] = 20; }
const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(path.join(directory, 'vermelho.png'), png);
fs.writeFileSync(path.join(directory, 'notas.txt'), 'CODIGO_VALIDACAO=ANEXO-LOCAL-7429\nEste é o conteúdo completo do arquivo de teste.\n');
fs.writeFileSync(path.join(directory, 'exemplo.ts'), 'export const soma = (a: number, b: number) => a + b;\n');
fs.writeFileSync(path.join(directory, 'binario.txt'), Buffer.from([0, 1, 255, 0]));
fs.writeFileSync(path.join(directory, 'documento.pdf'), '%PDF-1.7\nfixture sem processamento PDF');
fs.writeFileSync(path.join(directory, 'seed.json'), JSON.stringify({ alpha: alpha.conversation, beta: beta.conversation }, null, 2));
console.log(`Fixture de anexos: ${directory}`);
