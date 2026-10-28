import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OllamaClient } from '../dist/index.js';

async function server(handler, run) {
  const s = createServer(handler); s.listen(0, '127.0.0.1'); await once(s, 'listening');
  try { await run(new OllamaClient(`http://127.0.0.1:${s.address().port}`)); }
  finally { s.closeAllConnections(); await new Promise(resolve => s.close(resolve)); }
}
const request = { model: 'real:tag', messages: [{ role: 'user', content: 'olá' }] };
test('version and model metadata preserve names', async () => server((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(req.url === '/api/version' ? { version: '1' } : { models: [{ name: 'model:tag', size: 4, modified_at: 'now', details: { family: 'llama' } }] }));
}, async c => { assert.equal((await c.health()).connected, true); assert.deepEqual(await c.listModels(), [{ name: 'model:tag', size: 4, modifiedAt: 'now', family: 'llama' }]); }));
test('NDJSON handles split UTF-8, partial lines and final line', async () => server((req, res) => {
  const bytes = Buffer.from('{"message":{"content":"olá"}}\n{"message":{"content":"!"},"done":true}');
  const split = bytes.indexOf(Buffer.from('á')) + 1; res.write(bytes.subarray(0, split)); setTimeout(() => res.end(bytes.subarray(split)), 10);
}, async c => { const output = []; for await (const part of c.chat(request)) output.push(part); assert.deepEqual(output, ['olá', '!']); }));
test('stream errors and premature end propagate', async () => {
  await server((_req, res) => res.end('{"error":"modelo ausente"}\n'), async c => { await assert.rejects(async () => { for await (const _ of c.chat(request)) {} }, /modelo ausente/); });
  await server((_req, res) => res.end('{"message":{"content":"x"}}\n'), async c => { await assert.rejects(async () => { for await (const _ of c.chat(request)) {} }, /antes da confirmação/); });
});
test('abort interrupts a live stream', async () => server((_req, res) => { res.write('{"message":{"content":"x"}}\n'); }, async c => {
  const controller = new AbortController(); const stream = c.chat({ ...request, signal: controller.signal });
  assert.equal((await stream.next()).value, 'x'); controller.abort(); await assert.rejects(stream.next(), { name: 'AbortError' });
}));
test('rejects unsafe URLs', () => { assert.throws(() => new OllamaClient('http://user:pass@localhost')); assert.throws(() => new OllamaClient('file:///tmp/x')); });
test('closing the generator cancels the HTTP response', async () => {
  let closed;
  const disconnected = new Promise(resolve => { closed = resolve; });
  await server((_req, res) => { res.on('close', closed); res.write('{"message":{"content":"x"}}\n'); }, async c => {
    const stream = c.chat(request); await stream.next(); await stream.return();
    await Promise.race([disconnected, new Promise((_, reject) => setTimeout(() => reject(new Error('connection remained open')), 1000))]);
  });
});
test('done terminates without waiting for the server to close', async () => server((_req, res) => {
  res.write('{"message":{"content":"final"},"done":true}\n');
}, async c => {
  const stream = c.chat(request);
  assert.equal((await stream.next()).value, 'final');
  assert.equal((await stream.next()).done, true);
}));
test('forwards an explicitly disabled thinking option', async () => server(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  assert.equal(JSON.parse(body).think, false);
  res.end('{"done":true}\n');
}, async c => { for await (const _ of c.chat({ ...request, think: false })) {} }));
test('recommendations use declared parameters and architecture-specific maximum', async () => server(async (req, res) => {
  if (req.url === '/api/tags') { res.end(JSON.stringify({ models: [{ name: 'custom', size: 6594474748, modified_at: 'now' }] })); return; }
  assert.equal(req.url, '/api/show'); let body = ''; for await (const c of req) body += c; assert.deepEqual(JSON.parse(body), { model: 'custom' });
  res.end(JSON.stringify({ parameters: 'num_ctx 65536\ntemperature 0.1', model_info: { 'other.context_length': 8192, 'general.architecture': 'qwen', 'qwen.context_length': 262144 }, capabilities: ['completion', 'thinking'], thinking: { values: [false, true], default: true } }));
}, async c => assert.deepEqual(await c.recommendations('custom'), { model: 'custom', temperature: 0.1, numCtx: 65536, contextLimit: 262144, modelSizeBytes: 6594474748, think: true, thinkingValues: [false, true], thinkingSupported: true, capabilities: ['completion', 'thinking'], source: 'ollama' })));
test('recommendations leave missing settings unset and preserve string thinking values', async () => server((_req, res) => {
  res.end(JSON.stringify({ parameters: 'temperature 1', model_info: { 'gemma.context_length': 131072 }, thinking: { values: ['low', 'high'], default: 'low' } }));
}, async c => assert.deepEqual(await c.recommendations('gemma'), { model: 'gemma', temperature: 1, numCtx: null, contextLimit: 131072, think: 'low', thinkingValues: ['low', 'high'], thinkingSupported: true, capabilities: [], source: 'ollama' })));
test('recommendations clamp declared context and preserve unknown capabilities', async () => server((_req, res) => {
  res.end(JSON.stringify({ parameters: 'num_ctx 300000', model_info: { 'qwen.context_length': 262144, 'general.architecture': 'qwen' } }));
}, async c => { const result = await c.recommendations('q'); assert.equal(result.numCtx, 262144); assert.equal(result.thinkingSupported, null); assert.equal(result.think, null); }));
test('recommendations propagate HTTP errors and identify thinking capability', async () => {
  await server((_req, res) => { res.statusCode = 404; res.end(); }, async c => assert.rejects(c.recommendations('missing'), /HTTP 404/));
  await server((_req, res) => res.end(JSON.stringify({ capabilities: ['thinking'] })), async c => { const result = await c.recommendations('m'); assert.equal(result.thinkingSupported, true); assert.equal(result.think, null); assert.equal(result.numCtx, null); });
});
test('KV estimate counts recurrent zero layers and scalar heads', async () => {
  const check = async (heads, expected) => server((req, res) => {
    if (req.url === '/api/tags') { res.statusCode = 500; res.end(); return; }
    res.end(JSON.stringify({ model_info: { 'general.architecture': 'qwen', 'qwen.block_count': 4, 'qwen.attention.head_count_kv': heads, 'qwen.attention.key_length': 256, 'qwen.attention.value_length': 256 } }));
  }, async c => assert.equal((await c.recommendations('q')).kvBytesPerToken, expected));
  await check([0, 0, 0, 4], 4096);
  await check(4, 16384);
});
test('running models maps memory and context metadata', async () => server((req, res) => {
  assert.equal(req.url, '/api/ps'); res.end(JSON.stringify({ models: [{ name: 'q:latest', size: 5444, size_vram: 5000, context_length: 4096 }] }));
}, async c => assert.deepEqual(await c.runningModels(), [{ name: 'q:latest', size: 5444, sizeVram: 5000, contextLength: 4096 }])));
test('attachment messages preserve history, image bytes, and text names without image placeholders', async () => {
  const { prepareAttachmentMessages } = await import('../dist/index.js');
  const prepared = prepareAttachmentMessages([{ role:'user', content:'primeira', attachments:[{id:'a',name:'nota.txt',kind:'text',mimeType:'text/plain',text:'conteúdo',size:9},{id:'b',name:'img.png',kind:'image',mimeType:'image/png',data:'YWJj',size:3}] }, { role:'assistant', content:'resposta' }, {role:'user',content:'nova'}], 'sistema');
  assert.equal(prepared[0].content,'sistema'); assert.match(prepared[1].content,/nota.txt/); assert.match(prepared[1].content,/conteúdo/); assert.deepEqual(prepared[1].images,['YWJj']); assert.equal(prepared[2].content,'resposta'); assert.equal(prepared[3].images,undefined);
});
test('attachment budget counts UTF-8 and pixels and reserves output', async () => {
  const { estimateAttachmentContext } = await import('../dist/index.js');
  const messages = [{role:'user',content:'á'}];
  const image = {id:'x',name:'x.png',kind:'image',mimeType:'image/png',data:'x',size:1,width:256,height:256};
  assert.deepEqual(estimateAttachmentContext(messages,[image],4096),{ estimatedTokens:578,inputBudget:3072,fits:true });
  assert.equal(estimateAttachmentContext(messages,[{...image,width:undefined,height:undefined}],4096).fits,false);
});
test('chat sends text and image fields intact', async () => server(async (req,res) => {
  let body=''; for await (const chunk of req) body += chunk;
  const parsed=JSON.parse(body); assert.deepEqual(parsed.messages,[{role:'user',content:'conteúdo',images:['YWJj']}]); res.end('{"done":true}\n');
}, async c => { for await (const _ of c.chat({model:'vision',messages:[{role:'user',content:'conteúdo',images:['YWJj']}] })) {} }));
