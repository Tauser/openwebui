import { resolve } from 'node:path';
import { createServer } from './server.js';
import { validBindHost } from './network.js';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3001);
if (!validBindHost(host) || !Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('HOST deve ser localhost, 0.0.0.0 ou um IP privado local; PORT deve estar entre 0 e 65535');
}
const app = createServer(resolve(process.env.CODEX_LOCAL_DATA_DIR || 'data'));
try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  try { await app.close(); } catch (error) { console.error(error); process.exitCode = 1; }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
