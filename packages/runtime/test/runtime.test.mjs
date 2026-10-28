import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runToolLoop } from '../dist/index.js';
const tools = [{ type:'function', function:{ name:'read_file', description:'read', parameters:{ type:'object' } } }];
const call = { function:{ name:'read_file', arguments:{ path:'a' } } };
const base = { model:'fake', tools, checkpoint:{ messages:[{role:'user',content:'go'}], steps:0 }, save:async()=>{}, execute:async()=> 'contents', maxSteps:3 };
test('replays tool call and result into next model step', async()=>{
  let seen; let count=0;
  const provider={ chat:async (_m,messages)=>{ seen=structuredClone(messages); return ++count===1 ? {role:'assistant',content:'',tool_calls:[call]} : {role:'assistant',content:'finished'}; } };
  const r=await runToolLoop({...base,provider}); assert.equal(r.status,'complete'); assert.equal(seen[1].tool_calls[0].function.name,'read_file'); assert.deepEqual(seen[2],{role:'tool',tool_name:'read_file',content:'contents'});
});
test('limits model steps',async()=>{const provider={chat:async()=>({role:'assistant',content:'',tool_calls:[call]})}; const r=await runToolLoop({...base,provider,maxSteps:1});assert.equal(r.status,'max_steps');});
test('cancelled pending action requires reconciliation before resume',async()=>{const controller=new AbortController(); let saved; const provider={chat:async()=>({role:'assistant',content:'',tool_calls:[call]})}; const r=await runToolLoop({...base,provider,signal:controller.signal,save:async c=>{saved=structuredClone(c);controller.abort();}}); assert.equal(r.status,'cancelled'); const resumed=await runToolLoop({...base,provider,checkpoint:saved}); assert.equal(resumed.status,'reconcile');});
test('cancel before model resumes from checkpoint without repeating actions',async()=>{const controller=new AbortController();controller.abort();const provider={chat:async()=>({role:'assistant',content:'done'})};const r=await runToolLoop({...base,provider,signal:controller.signal});assert.equal(r.status,'cancelled');assert.equal((await runToolLoop({...base,provider,checkpoint:r.checkpoint})).status,'complete');});
