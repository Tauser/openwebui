const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:3344';
if(new URL(base).port==='3001') throw Error('Use uma instância isolada.');
async function api(path,method='GET',body){const r=await fetch(base+'/api/v1'+path,{method,headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}); assert.ok(r.ok,await r.clone().text());return r.json();}
(async()=>{
 const catalog=await api('/models'); assert.ok(catalog.models.length,'Ollama local necessário ao catálogo deste QA');
 const model=catalog.models[0].name;
 await api('/settings','PATCH',{model,theme:'dark'});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base);await page.getByRole('button',{name:'Configurações',exact:true}).first().click();
  await page.getByText('Nenhum servidor adicional cadastrado.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Salvar configurações',exact:true}).click();
  await page.getByText('Configurações salvas.',{exact:true}).waitFor();
  async function add(name,url){await page.getByRole('button',{name:'Adicionar servidor',exact:true}).click();await page.getByLabel('Nome do servidor',{exact:true}).fill(name);await page.getByLabel('URL do servidor',{exact:true}).fill(url);await page.getByRole('button',{name:'Salvar servidor',exact:true}).click();await page.getByRole('button',{name:'Editar servidor '+name,exact:true}).waitFor();}
  await add('GPU local','http://127.0.0.1:11434');await add('Offline','http://127.0.0.1:9');await add('Temporário','http://127.0.0.1:11434');
  await page.getByRole('button',{name:'Excluir servidor Temporário',exact:true}).click();
  await page.getByRole('button',{name:'Excluir servidor Temporário',exact:true}).waitFor({state:'detached'});
  await page.getByRole('button',{name:'Editar servidor GPU local',exact:true}).click();await page.getByLabel('Nome do servidor',{exact:true}).fill('GPU principal');await page.getByRole('button',{name:'Salvar servidor',exact:true}).click();
  await page.getByRole('button',{name:'Editar servidor GPU principal',exact:true}).waitFor();
  const endpoints=(await api('/endpoints')).endpoints;const local=endpoints.find(e=>e.name==='GPU principal'),offline=endpoints.find(e=>e.name==='Offline');
  await page.getByRole('button',{name:'Fechar configurações',exact:true}).click();
  const selector=page.getByLabel('Servidor da conversa',{exact:true});await selector.selectOption(local.id);
  await page.getByLabel('Mensagem',{exact:true}).fill('Rascunho preservado no QA');
  const send=page.getByRole('button',{name:'Enviar mensagem',exact:true});await send.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Enviar mensagem"]').disabled);
  await page.route('**/api/v1/conversations/*/messages',route=>route.fulfill({status:503,json:{error:'Falha simulada de geração'}}));
  await send.click();await page.getByText('Falha simulada de geração',{exact:true}).waitFor();
  const conversations=(await api('/conversations')).conversations;assert.equal(conversations.length,1);assert.equal(conversations[0].endpointId,local.id);
  assert.equal(await page.getByLabel('Mensagem',{exact:true}).inputValue(),'Rascunho preservado no QA');
  await page.reload();await page.waitForFunction(id=>document.querySelector('[aria-label="Servidor da conversa"]')?.value===id,local.id);
  await page.route('**/api/v1/conversations/'+conversations[0].id,route=>route.request().method()==='PATCH'?route.fulfill({status:409,json:{error:'Falha simulada de troca'}}):route.continue());
  await selector.selectOption('');await page.getByText('Não foi possível alterar o servidor: Falha simulada de troca',{exact:true}).waitFor();assert.equal(await selector.inputValue(),local.id);
  await page.unroute('**/api/v1/conversations/'+conversations[0].id);
  await selector.selectOption('');await page.waitForFunction(()=>document.querySelector('[aria-label="Servidor da conversa"]').value==='');
  assert.equal((await api('/conversations/'+conversations[0].id)).conversation.endpointId,undefined);
  await selector.selectOption(local.id);await page.waitForFunction(id=>document.querySelector('[aria-label="Servidor da conversa"]').value===id,local.id);
  await page.getByRole('button',{name:'Configurações',exact:true}).first().click();await page.getByRole('button',{name:'Excluir servidor GPU principal',exact:true}).click();await page.getByText('Endpoint vinculado a uma conversa ou geração',{exact:true}).waitFor();
  assert.ok((await api('/endpoints')).endpoints.some(e=>e.id===local.id));
  await page.getByRole('button',{name:'Fechar configurações',exact:true}).click();await selector.selectOption(offline.id);
  await page.waitForFunction(()=>document.querySelector('[aria-label="Enviar mensagem"]')?.disabled===true);
  await page.getByRole('button',{name:'Selecionar modelo',exact:true}).click();await page.getByText('Nenhum modelo disponível.',{exact:true}).waitFor();await page.keyboard.press('Escape');
  await selector.selectOption(local.id);await page.waitForFunction(()=>!document.querySelector('[aria-label="Enviar mensagem"]').disabled);
  fs.mkdirSync('artifacts/qa',{recursive:true});await page.screenshot({path:'artifacts/qa/endpoints-1440.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.equal(await selector.isVisible(),true);
  const bounds=await selector.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
  await page.screenshot({path:'artifacts/qa/endpoints-390.png'});
  await page.route('**/api/v1/endpoints',route=>route.request().method()==='GET'?route.fulfill({status:500,json:{error:'Falha de listagem'}}):route.continue());
  await page.reload();await page.getByRole('button',{name:'Configurações',exact:true}).first().click();await page.getByText('Não foi possível carregar os servidores cadastrados.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  const report={checkedAt:new Date().toISOString(),isolated:true,realCatalog:true,inferenceSent:false,checks:['CRUD servidores','settings salva sem preencher cadastro','seleção inicial persistida no POST','reload conserva vínculo','falha PATCH conserva seleção','null retorna padrão global','exclusão referenciada rejeitada','offline limpa catálogo','rascunho preservado em falha','desktop e celular','erro de listagem explícito'],pageErrors:errors};fs.writeFileSync('artifacts/qa/endpoints-ui.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
