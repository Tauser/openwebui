import { createServer as createHttp } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from '../../apps/server/dist/server.js';
const base=path.resolve('.data'); await mkdir(base,{recursive:true}); const dir=await mkdtemp(path.join(base,'profile-probe-'));
const evidence={kind:'servidor Ollama simulado em loopback',checks:[],createdAt:new Date().toISOString()};
let readyResolve; const ready=new Promise(resolve=>{readyResolve=resolve}); const calls=[];
const fake=createHttp(async(req,res)=>{
  let body=''; for await(const chunk of req) body+=chunk;
  if(req.url==='/api/tags') return res.end(JSON.stringify({models:['global','projeto','conversa'].map(name=>({name,size:1,modified_at:'2026-01-01'}))}));
  if(req.url==='/api/show') return res.end(JSON.stringify({parameters:'num_ctx 2048',model_info:{'general.architecture':'fake','fake.context_length':4096},capabilities:['completion']}));
  if(req.url==='/api/version') return res.end(JSON.stringify({version:'fake'}));
  if(req.url==='/api/ps') return res.end(JSON.stringify({models:[]}));
  if(req.url==='/api/chat') { const input=JSON.parse(body); calls.push(input); res.write(JSON.stringify({message:{content:'parcial'},done:false})+'\n'); if(input.messages.at(-1).content==='cancelar'){readyResolve();return;} return res.end(JSON.stringify({message:{content:'-fim'},done:true})+'\n'); }
  res.statusCode=404; res.end();
});
let app;
try {
 fake.listen(0,'127.0.0.1'); await once(fake,'listening'); app=createServer(dir); await app.ready();
 const request=async(method,url,payload,expected=200)=>{const r=await app.inject({method,url,headers:{host:'localhost',...(payload===undefined?{}:{'content-type':'application/json'})},...(payload===undefined?{}:{payload})}); assert.equal(r.statusCode,expected,`${method} ${url}: ${r.body}`); return r;};
 const global={model:'global',systemPrompt:'sistema global',followModelDefaults:false,temperature:0.1,numCtx:4096,think:false};
 const project={model:'projeto',systemPrompt:'sistema projeto',followModelDefaults:false,temperature:0.2,numCtx:4096,think:true};
 const conversation={model:'conversa',systemPrompt:'sistema conversa',followModelDefaults:false,temperature:0.3,numCtx:4096,think:false};
 await request('PATCH','/api/v1/settings',{...global,ollamaUrl:`http://127.0.0.1:${fake.address().port}`});
 const projectProfile=(await request('POST','/api/v1/profiles',{name:'Projeto',...project},201)).json();
 const convProfile=(await request('POST','/api/v1/profiles',{name:'Conversa',...conversation},201)).json();
 const section=(await request('POST','/api/v1/sections',{name:'Projeto',profileId:projectProfile.id},201)).json();
 const conv=(await request('POST','/api/v1/conversations',{sectionId:section.id},201)).json().conversation;
 const config=async query=>(await request('GET',`/api/v1/configuration${query}`)).json();
 assert.equal((await config('')).settings.model,'global'); assert.equal((await config(`?sectionId=${section.id}`)).settings.model,'projeto');
 const assertEffective=async(expected,source,overrides)=>{const c=await config(`?conversationId=${conv.id}`); for(const key of Object.keys(expected)) assert.equal(c.settings[key],expected[key],key); assert.equal(c.source,source); assert.equal(c.hasOverrides,overrides);};
 const generate=async(expected,label)=>{const response=await request('POST',`/api/v1/conversations/${conv.id}/messages`,{content:label}); const events=response.body.trim().split('\n').map(JSON.parse); assert.equal(events.at(-1).message.status,'complete'); const call=calls.at(-1); assert.equal(call.model,expected.model); assert.equal(call.messages[0].role,'system'); assert.equal(call.messages[0].content,expected.systemPrompt); assert.equal(call.options.temperature,expected.temperature); assert.equal(call.options.num_ctx,expected.numCtx); assert.equal(call.think,expected.think);};
 await assertEffective(project,'project',false); await generate(project,'projeto'); evidence.checks.push('configuração global e projeto, payload projeto');
 await request('PATCH',`/api/v1/conversations/${conv.id}`,{profileId:convProfile.id}); await assertEffective(conversation,'conversation',false); await generate(conversation,'conversa'); evidence.checks.push('perfil da conversa sobrepõe projeto');
 const overrides={temperature:0.6,numCtx:8192,systemPrompt:'sistema override',think:true}; const effective={...conversation,...overrides};
 await request('PATCH',`/api/v1/conversations/${conv.id}`,{configOverrides:overrides}); await assertEffective(effective,'conversation',true); await generate(effective,'override'); evidence.checks.push('override manual prevalece e contexto 8192 é enviado acima do limite 4096 informado');
 await request('DELETE',`/api/v1/profiles/${convProfile.id}`,undefined,409);
 const detail=(await request('GET',`/api/v1/conversations/${conv.id}`)).json(); const fork=(await request('POST',`/api/v1/conversations/${conv.id}/fork`,{messageId:detail.messages[0].id},201)).json(); assert.equal(fork.conversation.profileId,convProfile.id); assert.deepEqual(fork.conversation.configOverrides,overrides); evidence.checks.push('perfil vinculado protegido e fork preserva perfil e overrides');
 const pending=Promise.resolve(app.inject({method:'POST',url:`/api/v1/conversations/${conv.id}/messages`,headers:{host:'localhost','content-type':'application/json'},payload:{content:'cancelar'}}));
 await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timeout')),15000))]);
 const deadline=Date.now()+5000; while(true){const current=(await request('GET',`/api/v1/conversations/${conv.id}`)).json();if(current.messages.at(-1)?.content==='parcial')break;if(Date.now()>deadline)throw new Error('Timeout no delta'); await new Promise(r=>setTimeout(r,20));}
 assert.equal((await request('POST',`/api/v1/conversations/${conv.id}/cancel`,{})).json().cancelled,true); assert.equal((await pending).body.trim().split('\n').map(JSON.parse).at(-1).message.status,'cancelled');
 await generate(effective,'continuar'); evidence.checks.push('cancelamento e nova geração usam configuração resolvida'); evidence.success=true;
} catch(error){evidence.success=false;evidence.error=error instanceof Error?error.message:String(error);process.exitCode=1;}
finally {if(app)await app.close();if(fake.listening){fake.closeAllConnections();await new Promise(resolve=>fake.close(resolve));}await writeFile(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({directory:dir,...evidence},null,2));}

