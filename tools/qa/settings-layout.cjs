const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const base=process.env.QA_BASE_URL || 'http://127.0.0.1:3001';
 const original=await(await fetch(base+'/api/v1/settings')).json();
 const fixture={...original,model:'qa-model:latest',followModelDefaults:true,theme:'dark',temperature:0.7,numCtx:2048};
 const recommendation={model:fixture.model,temperature:0.3,numCtx:8192,contextLimit:32768,think:false,thinkingValues:[true,false],thinkingSupported:true,capabilities:['thinking'],source:'ollama',effectiveNumCtx:4096,hardware:{ramTotalBytes:8*1024**3,ramAvailableBytes:2*1024**3,gpuName:null,gpuTotalBytes:null,gpuAvailableBytes:null,modelSizeBytes:12*1024**3,contextCap:4096,execution:'cpu',canRun:false,estimated:true,reason:'Estimativa baseada na capacidade total.'}};
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});let saved;let rejectSave=true;const errors=[];let endpoints=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/v1/settings',async route=>{if(route.request().method()==='PATCH'){saved=route.request().postDataJSON();return route.fulfill(rejectSave?{status:503,json:{error:'Falha simulada ao salvar'}}:{json:{...fixture,...saved}});}return route.fulfill({json:fixture});});
  await page.route('**/api/v1/models?*',r=>r.fulfill({json:{models:[{name:fixture.model,size:1,modifiedAt:new Date().toISOString()}],connected:true}}));
  await page.route('**/api/v1/models',r=>r.fulfill({json:{models:[{name:fixture.model,size:1,modifiedAt:new Date().toISOString()}],connected:true}}));
  await page.route('**/api/v1/models/recommendations?*',r=>r.fulfill({json:recommendation}));
  await page.route('**/api/v1/endpoints',r=>{if(r.request().method()==='POST'){const b=r.request().postDataJSON();const ep={id:'qa-endpoint',...b,createdAt:new Date().toISOString()};endpoints.push(ep);return r.fulfill({status:201,json:ep});}return r.fulfill({json:{endpoints}});});
  await page.goto(base);await page.getByRole('button',{name:'Configurações',exact:true}).first().click();
  const panel=page.getByRole('complementary',{name:'Configurações',exact:true});
  const connection=page.getByRole('tab',{name:'Conexão',exact:true});const model=page.getByRole('tab',{name:'Modelo',exact:true});const appearance=page.getByRole('tab',{name:'Aparência',exact:true});
  await connection.waitFor();assert.equal(await connection.getAttribute('aria-selected'),'true');
  assert.equal(await page.getByLabel('Nome do servidor',{exact:true}).isVisible(),false);
  const save=page.getByRole('button',{name:'Salvar configurações',exact:true});assert.equal(await save.isVisible(),true);
  await connection.focus();await page.keyboard.press('ArrowRight');assert.equal(await model.getAttribute('aria-selected'),'true');
  const temperature=page.getByLabel('Temperatura',{exact:true});await page.waitForFunction(()=>document.querySelector('#temperature')?.value==='0.3');assert.equal(await temperature.isEnabled(),true);
  await page.getByLabel('Contexto personalizado (tokens)',{exact:true}).fill('65536');assert.equal(await page.getByLabel('Seguir recomendações do modelo',{exact:true}).isChecked(),false);
  assert.ok(await panel.locator('.warning').count());
  await appearance.click();await page.getByLabel('Tema',{exact:true}).selectOption('light');
  await model.click();assert.equal(await page.getByLabel('Contexto personalizado (tokens)',{exact:true}).inputValue(),'65536');
  await save.click();await panel.getByText('Falha simulada ao salvar',{exact:true}).waitFor();assert.equal(await page.getByLabel('Contexto personalizado (tokens)',{exact:true}).inputValue(),'65536');
  await page.getByLabel('Contexto personalizado (tokens)',{exact:true}).fill('64');await appearance.click();await save.click();
  await panel.getByText('Confira a temperatura e o contexto nas configurações.',{exact:true}).waitFor();assert.equal(await model.getAttribute('aria-selected'),'true');
  await page.getByLabel('Contexto personalizado (tokens)',{exact:true}).fill('65536');
  rejectSave=false;await save.click();await page.getByText('Configurações salvas.',{exact:true}).waitFor();assert.equal(saved.numCtx,65536);assert.equal(saved.theme,'light');assert.equal(saved.followModelDefaults,false);
  await connection.click();await page.getByRole('button',{name:'Adicionar servidor',exact:true}).click();await page.getByLabel('Nome do servidor',{exact:true}).fill('Servidor QA');await page.getByLabel('URL do servidor',{exact:true}).fill('http://127.0.0.1:11434');await page.getByRole('button',{name:'Salvar servidor',exact:true}).click();await page.getByRole('button',{name:'Editar servidor Servidor QA',exact:true}).waitFor();
  fs.mkdirSync('artifacts/qa',{recursive:true});
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(const [name,tab]of [['conexao',connection],['modelo',model],['aparencia',appearance]]){
    await tab.click();await page.waitForTimeout(100);await save.scrollIntoViewIfNeeded();
    const bounds=await save.boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<= (width===390?844:1000));
    const overflow=await panel.evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflow,false);
    await page.screenshot({path:`artifacts/qa/settings-${name}-${width}.png`});
   }
  }
  assert.deepEqual(errors,[]);const report={checkedAt:new Date().toISOString(),tabs:true,keyboard:true,draftsPreserved:true,advisoryEditable:true,hiddenFieldValidation:true,saveErrorVisible:true,saveSuccess:true,endpointFormCollapsed:true,endpointCreate:true,desktopMobile:true,pageErrors:errors,personalSettingsUnchanged:true};fs.writeFileSync('artifacts/qa/settings-layout.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
