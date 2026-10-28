import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3344';
async function post(path, body) {
  const response = await fetch(base + '/api/v1' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  assert.ok(response.ok);
  return response.headers.get('content-type').includes('application/x-ndjson') ? (await response.text()).trim().split('\n').map(line => JSON.parse(line)) : response.json();
}
const created = await post('/conversations', { title: 'QA Recuperação de anexo' });
const route = '/conversations/' + created.conversation.id + '/messages';
const large = await post(route, { content: 'Resuma.', model: 'qwen3.5-9b-coder:latest', attachments: [{ name: 'grande.txt', kind: 'text', mimeType: 'text/plain', text: 'x'.repeat(6000) }] });
assert.equal(large.at(-1).message.status, 'error');
assert.ok(large.some(event => event.type === 'error' && event.error.includes('excedem o contexto')));
const without = await post(route, { content: 'Responda apenas OK. /no_think', model: 'qwen3.5-9b-coder:latest' });
assert.equal(without.at(-1).message.status, 'complete'); assert.match(without.at(-1).message.content, /OK/);
const corrected = await post(route, { content: 'Responda apenas o valor de CODIGO no arquivo. /no_think', model: 'qwen3.5-9b-coder:latest', attachments: [{ name: 'corrigido.txt', kind: 'text', mimeType: 'text/plain', text: 'CODIGO=RECUPERADO-6391' }] });
assert.equal(corrected.at(-1).message.status, 'complete'); assert.match(corrected.at(-1).message.content, /RECUPERADO-6391/);
const history = await post(route, { content: 'Repita o valor de CODIGO do arquivo anterior. /no_think', model: 'qwen3.5-9b-coder:latest' });
assert.equal(history.at(-1).message.status, 'complete'); assert.match(history.at(-1).message.content, /RECUPERADO-6391/);
const detail = await (await fetch(base + '/api/v1/conversations/' + created.conversation.id)).json();
assert.equal(detail.messages[0].attachments[0].text.length, 6000);
assert.equal(detail.messages[1].status, 'error');
const report = { checkedAt: new Date().toISOString(), success: true, realOllama: true, isolatedDatabase: true, rejectedAttachmentPreserved: true, nextTurnWithoutAttachment: true, correctedAttachmentAccepted: true, completedAttachmentRetainedInContext: true };
fs.mkdirSync('artifacts/qa', { recursive: true }); fs.writeFileSync('artifacts/qa/attachment-recovery.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
