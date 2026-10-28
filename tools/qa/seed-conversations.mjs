import { Store } from '../../apps/server/dist/store.js';
import fs from 'node:fs';
import path from 'node:path';
const directory = path.resolve('.data/qa-i022');
const store = new Store(directory);
store.saveSettings({...store.settings(),model:'qwen3.5-9b-coder:latest',followModelDefaults:false,numCtx:4096,think:false,theme:'dark'});
const suffix = Date.now();
const alpha = store.create(`QA Alpha ${suffix}`);
store.addMessage(alpha.conversation.id,'user','Responda apenas OK. /no_think','complete');
store.addMessage(alpha.conversation.id,'assistant','OK','complete','qwen3.5-9b-coder:latest');
const beta = store.create(`QA Beta ${suffix}`);
for(let i=0;i<18;i++) {
  store.addMessage(beta.conversation.id,'user',`Pedido de teste ${i}`,'complete');
  store.addMessage(beta.conversation.id,'assistant',`Texto de fixture para testar leitura e rolagem ${i}.\n\n`.repeat(12),'complete','qwen3.5-9b-coder:latest');
}
store.close();
fs.writeFileSync(path.join(directory,'seed.json'),JSON.stringify({alpha:alpha.conversation,beta:beta.conversation},null,2));
console.log('Fixtures criadas na base isolada .data/qa-i022.');
