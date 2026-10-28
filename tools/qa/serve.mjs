import path from 'node:path';
import { createServer } from '../../apps/server/dist/server.js';

const directory = path.resolve(process.argv[2] || '.data/qa-i023');
if (!directory.startsWith(path.resolve('.data') + path.sep)) throw new Error('Use uma base isolada dentro de .data/.');
const port = Number(process.argv[3] || 3344);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 3001) throw new Error('Porta de QA inválida.');
const app = createServer(directory);
await app.listen({ host: '127.0.0.1', port });
console.log(`QA em http://127.0.0.1:${port}`);
process.on('SIGTERM', async () => { await app.close(); });
process.on('SIGINT', async () => { await app.close(); });
