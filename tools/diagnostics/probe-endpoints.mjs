import { createServer as createHttp } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from '../../apps/server/dist/server.js';

const base = path.resolve('.data'); await mkdir(base, {recursive:true});
const dir = await mkdtemp(path.join(base, 'endpoint-probe-'));
const evidence = { kind:'dois servidores Ollama simulados em loopback', realSecondHostTested:false, checks:[], createdAt:new Date().toISOString() };
let readyResolve; const ready = new Promise(resolve => { readyResolve=resolve; });
function fake(name) {
  const requests = [];
  const server = createHttp(async (req,res) => {
    requests.push(req.url); let body=''; for await (const c of req) body+=c;
    if (req.url === '/api/version') return res.end(JSON.stringify({version:'fake'}));
    if (req.url === '/api/tags') return res.end(JSON.stringify({models:[{name:`${name}:latest`,size:1,modified_at:'2026-01-01T00:00:00Z'}]}));
    if (req.url === '/api/show') return res.end(JSON.stringify({parameters:'num_ctx 4096',model_info:{'general.architecture':'fake','fake.context_length':4096},capabilities:['completion']}));
    if (req.url === '/api/ps') return res.end(JSON.stringify({models:[]}));
    if (req.url === '/api/chat') {
      const input=JSON.parse(body); const last=input.messages.at(-1).content;
      res.setHeader('content-type','application/x-ndjson');
      res.write(JSON.stringify({message:{content:`${name}-parcial`},done:false})+'\n');
      if (last === 'cancelar') { readyResolve(); return; }
      return res.end(JSON.stringify({message:{content:`-${name}-fim`},done:true})+'\n');
    }
    res.statusCode=404; res.end();
  });
  return {server,requests,name};
}
const a=fake('alpha'), b=fake('beta');
let app;
try {
  for (const f of [a,b]) { f.server.listen(0,'127.0.0.1'); await once(f.server,'listening'); }
  app=createServer(dir); await app.ready();
  const request=async (method,url,payload) => { const result=await app.inject({method,url,headers:{host:'localhost','content-type':'application/json'},...(payload === undefined ? {} : {payload})}); assert.ok(result.statusCode < 400, `${method} ${url}: ${result.statusCode} ${result.body}`); return result; };
  const epA=(await request('POST','/api/v1/endpoints',{name:'alpha',url:`http://127.0.0.1:${a.server.address().port}`})).json();
  const epB=(await request('POST','/api/v1/endpoints',{name:'beta',url:`http://127.0.0.1:${b.server.address().port}`})).json();
  for (const [f,ep] of [[a,epA],[b,epB]]) {
    const models=(await request('GET',`/api/v1/models?endpointId=${ep.id}`)).json(); assert.deepEqual(models.models.map(x=>x.name),[`${f.name}:latest`]);
    const rec=(await request('GET',`/api/v1/models/recommendations?endpointId=${ep.id}&model=${f.name}:latest`)).json(); assert.equal(rec.model,`${f.name}:latest`);
    evidence.checks.push(`${f.name}: catálogo e recomendações`);
  }
  const convA=(await request('POST','/api/v1/conversations',{endpointId:epA.id})).json().conversation;
  const convB=(await request('POST','/api/v1/conversations',{endpointId:epB.id})).json().conversation;
  for (const [f,conv] of [[a,convA],[b,convB]]) {
    const stream=await request('POST',`/api/v1/conversations/${conv.id}/messages`,{content:'teste',model:`${f.name}:latest`});
    const done=stream.body.trim().split('\n').map(line=>JSON.parse(line)).find(event=>event.type==='done'); assert.equal(done.message.status,'complete'); assert.equal(done.message.content,`${f.name}-parcial-${f.name}-fim`); evidence.checks.push(`${f.name}: chat e streaming`);
  }
  const pending=Promise.resolve(app.inject({method:'POST',url:`/api/v1/conversations/${convB.id}/messages`,headers:{host:'localhost','content-type':'application/json'},payload:{content:'cancelar',model:'beta:latest'}}));
  await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timeout aguardando streaming')),15000))]);
  const deadline=Date.now()+5000;
  while (true) {
    const current=(await request('GET',`/api/v1/conversations/${convB.id}`)).json();
    if (current.messages.at(-1)?.content === 'beta-parcial') break;
    if (Date.now()>deadline) throw new Error('Timeout aguardando persistência do primeiro delta');
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  const cancel=(await request('POST',`/api/v1/conversations/${convB.id}/cancel`,{})).json(); assert.equal(cancel.cancelled,true);
  const cancelled=(await pending).body.trim().split('\n').map(line=>JSON.parse(line)).find(event=>event.type==='done'); assert.equal(cancelled.message.status,'cancelled'); assert.equal(cancelled.message.content,'beta-parcial');
  const resumed=await request('POST',`/api/v1/conversations/${convB.id}/messages`,{content:'continuar',model:'beta:latest'}); const resumedDone=resumed.body.trim().split('\n').map(line=>JSON.parse(line)).find(event=>event.type==='done'); assert.equal(resumedDone.message.content,'beta-parcial-beta-fim'); evidence.checks.push('beta: cancelamento e nova geração no mesmo endpoint');
  const detail=(await request('GET',`/api/v1/conversations/${convB.id}`)).json(); assert.equal(detail.conversation.endpointId,epB.id);
  const fork=(await request('POST',`/api/v1/conversations/${convB.id}/fork`,{messageId:detail.messages[0].id})).json(); assert.equal(fork.conversation.endpointId,epB.id);
  const forkResponse=await request('POST',`/api/v1/conversations/${fork.conversation.id}/messages`,{content:'fork',model:'beta:latest'}); assert.match(forkResponse.body,/beta-parcial-beta-fim/); evidence.checks.push('fork herda endpoint beta e usa seu transporte');
  evidence.success=true;
} catch(error) { evidence.success=false; evidence.error=error instanceof Error ? error.message : String(error); process.exitCode=1; }
finally {
  if(app) await app.close();
  for(const f of [a,b]) if(f.server.listening) { f.server.closeAllConnections(); await new Promise(resolve=>f.server.close(resolve)); }
  await writeFile(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2)); console.log(JSON.stringify({directory:dir,...evidence},null,2));
}
