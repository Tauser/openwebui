const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3001';
  const settings = await (await fetch(base + '/api/v1/settings')).json();
  const model = settings.model;
  const recommendation = { model, temperature: 0.3, numCtx: 8192, contextLimit: 32768, think: false, thinkingValues: [true,false], thinkingSupported:true, capabilities:['thinking'], source:'ollama', effectiveNumCtx:4096, hardware:{ramTotalBytes:8*1024**3,ramAvailableBytes:2*1024**3,gpuName:null,gpuTotalBytes:null,gpuAvailableBytes:null,modelSizeBytes:12*1024**3,contextCap:4096,execution:'cpu',canRun:false,estimated:true,reason:'Estimativa baseada no total'} };
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[]; let saved;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/v1/settings', async route => {
      if(route.request().method()==='PATCH') { saved=route.request().postDataJSON(); return route.fulfill({json:{...settings,...saved}}); }
      return route.fulfill({json:{...settings,followModelDefaults:true,temperature:1.5,numCtx:2048}});
    });
    await page.route('**/api/v1/models/recommendations?*', route => route.fulfill({json:recommendation}));
    await page.goto(base);
    await page.getByRole('button',{name:'Configurações',exact:true}).first().click();
    await page.getByRole('tab',{name:'Modelo',exact:true}).click();
    const temperature=page.getByLabel('Temperatura',{exact:true});
    const context=page.getByLabel('Janela de contexto',{exact:true});
    const auto=page.getByLabel('Seguir recomendações do modelo',{exact:true});
    await page.waitForFunction(()=>document.querySelector('#temperature')?.value==='0.3');
    assert.equal(await temperature.isEnabled(),true);
    assert.equal(await context.isEnabled(),true);
    assert.equal(await page.getByLabel('Raciocínio do modelo',{exact:true}).isEnabled(),true);
    await temperature.fill('0.8');
    assert.equal(await auto.isChecked(),false);
    assert.equal(await context.inputValue(),'4096');
    await context.selectOption('65536');
    await page.locator('#settings-section-model .warning').filter({hasText:'32.768'}).waitFor();
    await page.getByText('Temperatura acima da recomendação',{exact:false}).waitFor();
    const custom=page.getByLabel('Contexto personalizado (tokens)',{exact:true});
    await custom.fill('12345');
    assert.equal(await context.inputValue(),'12345');
    await page.getByRole('button',{name:'Salvar configurações',exact:true}).click();
    await page.waitForTimeout(200);
    assert.equal(saved.numCtx,12345);
    assert.equal(saved.temperature,0.8);
    assert.equal(saved.followModelDefaults,false);
    assert.equal(saved.think,false);
    assert.deepEqual(errors,[]);
    fs.mkdirSync('artifacts/qa',{recursive:true});
    await custom.scrollIntoViewIfNeeded();
    await page.screenshot({path:'artifacts/qa/advisory-settings.png'});
    const report={checkedAt:new Date().toISOString(),editableWhileAutomatic:true,manualPreservesVisibleDefaults:true,aboveHardwareAndModelAllowed:true,customValueSaved:12345,temperatureWarning:true,personalSettingsUnchanged:true,pageErrors:errors};
    fs.writeFileSync('artifacts/qa/advisory-settings.json',JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
