// Instância descartável: provider simulado para QA de UI, sem inferência pessoal.
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createServer} from '../../apps/server/dist/server.js';
const directory=path.resolve(process.argv[2] || '.data/qa-profiles-ui');
if(!directory.startsWith(path.resolve('.data')+path.sep)) throw Error('Use uma base dentro de .data.');
const port=Number(process.argv[3] || 3350);
if(!Number.isInteger(port)||port<1024||port>65535||port===3001) throw Error('Porta de QA inválida.');
const app=createServer(directory,()=>({
 health:async()=>({connected:true}),
 listModels:async()=>['qa-alpha:latest','qa-beta:latest'].map(name=>({name,size:1024,modifiedAt:new Date().toISOString()})),
 recommendations:async(model)=>({model,temperature:0.3,numCtx:4096,contextLimit:8192,think:false,thinkingValues:[true,false],thinkingSupported:true,capabilities:['completion','thinking'],source:'ollama',modelSizeBytes:1024,kvBytesPerToken:32768}),
 async *chat(request){for(const chunk of ['Resposta ','simulada ','de QA.']){await delay(80,undefined,{signal:request.signal});yield chunk;}}
}));
await app.listen({host:'127.0.0.1',port});
console.log(`QA de perfis com provider simulado em http://127.0.0.1:${port}`);
process.on('SIGTERM',async()=>{await app.close();});
process.on('SIGINT',async()=>{await app.close();});
