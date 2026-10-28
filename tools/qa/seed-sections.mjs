import { Store } from '../../apps/server/dist/store.js';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.data');
const directory = path.resolve(process.env.QA_DATA_DIR || '.data/qa-i023');
if (!directory.startsWith(root + path.sep)) throw new Error('A fixture deve estar dentro de .data/');
if (fs.existsSync(path.join(directory, 'codex-local.sqlite'))) throw new Error('A base de QA já existe; escolha outro QA_DATA_DIR.');
const store = new Store(directory);
store.saveSettings({ ...store.settings(), theme: 'dark' });
const alpha = store.create('QA Alpha');
store.addMessage(alpha.conversation.id, 'user', 'Pedido da fixture de organização.', 'complete');
store.addMessage(alpha.conversation.id, 'assistant', 'Resposta preservada ao mover e remover seções.', 'complete');
const beta = store.create('QA Beta');
store.close();
fs.writeFileSync(path.join(directory, 'seed.json'), JSON.stringify({ alpha: alpha.conversation, beta: beta.conversation }, null, 2));
console.log(`Fixture isolada: ${directory}`);
