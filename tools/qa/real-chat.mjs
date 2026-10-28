import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3341';
const model = process.env.QA_MODEL || 'qwen3.5-9b-coder:latest';
const json = (method, body) => ({ method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
async function api(url, init) { const r = await fetch(base + '/api/v1' + url, init); assert.equal(r.ok, true, await r.clone().text()); return r.json(); }
const report = { checkedAt:new Date().toISOString(), model, streaming:false, persisted:false, cancelled:false };
await api('/settings', json('PATCH', { followModelDefaults:false, think:false, numCtx:4096 }));
const created = await api('/conversations', json('POST', {title:'QA integração real'}));
const id = created.conversation.id;
const start = Date.now();
const response = await fetch(`${base}/api/v1/conversations/${id}/messages`, {...json('POST',{content:'Responda apenas OK, sem explicação. /no_think',model}),signal:AbortSignal.timeout(180000)});
assert.equal(response.ok,true);
const events=[]; let buffer=''; const decoder=new TextDecoder();
for await (const chunk of response.body) {
  buffer += decoder.decode(chunk,{stream:true});
  let end;
  while ((end=buffer.indexOf('\n'))>=0) { const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(line.trim())events.push(JSON.parse(line)); }
}
buffer+=decoder.decode();if(buffer.trim())events.push(JSON.parse(buffer));
const done=events.findLast(e=>e.type==='done');
assert.ok(events.some(e=>e.type==='delta'));
assert.equal(done?.message.status,'complete');
report.streaming=true;report.elapsedMs=Date.now()-start;report.deltaEvents=events.filter(e=>e.type==='delta').length;report.response=done.message.content;
const stored=await api(`/conversations/${id}`);assert.equal(stored.messages.at(-1).content,done.message.content);report.persisted=true;
const cancellation=await api('/conversations',json('POST',{title:'QA cancelamento real'}));
const cancelId=cancellation.conversation.id;
const cancelResponse=await fetch(`${base}/api/v1/conversations/${cancelId}/messages`,{...json('POST',{content:'Escreva uma explicação longa sobre bancos de dados.',model}),signal:AbortSignal.timeout(30000)});
const reader=cancelResponse.body.getReader();await reader.read();
const cancel=await api(`/conversations/${cancelId}/cancel`,json('POST',{}));assert.equal(cancel.cancelled,true);
await reader.cancel();const cancelled=await api(`/conversations/${cancelId}`);assert.equal(cancelled.messages.at(-1).status,'cancelled');report.cancelled=true;
for(const conversationId of [id,cancelId])await api(`/conversations/${conversationId}`,json('PATCH',{archived:true}));
fs.mkdirSync('artifacts/qa',{recursive:true});fs.writeFileSync(path.resolve('artifacts/qa/real-chat.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
