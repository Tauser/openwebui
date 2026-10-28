// Consulta metadados reais e testa a interface sem salvar configurações pessoais.
const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3001';

(async () => {
  const profiles = [];
  for (const model of ['qwen3.5-9b-coder:latest', 'gemma4:12b', 'JANA:latest']) {
    const response = await fetch(`${base}/api/v1/models/recommendations?model=${encodeURIComponent(model)}`);
    assert.equal(response.ok, true);
    const profile = await response.json();
    assert.equal(profile.model, model);
    assert.ok(profile.modelSizeBytes > 0);
    assert.ok(profile.effectiveNumCtx > 0);
    assert.ok(profile.effectiveNumCtx <= profile.hardware.contextCap);
    assert.equal(typeof profile.hardware.canRun, 'boolean');
    if (profile.contextLimit) assert.ok(profile.effectiveNumCtx <= profile.contextLimit);
    profiles.push(profile);
  }
  assert.equal(profiles[0].temperature, 0.1);
  assert.equal(profiles[0].numCtx, 65536);
  assert.equal(profiles[0].kvBytesPerToken, 32768);
  assert.equal(profiles[1].temperature, 1);
  assert.equal(profiles[1].numCtx, null);
  assert.equal(profiles[2].numCtx, 8192);
  assert.ok(profiles[2].modelSizeBytes > profiles[0].modelSizeBytes);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport:{width:1440,height:900} });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', {name:'Configurações',exact:true}).first().click();
    await page.getByRole('tab', {name:'Modelo',exact:true}).click();
    const automatic = page.getByLabel('Seguir recomendações do modelo', {exact:true});
    await automatic.waitFor();
    assert.equal(await automatic.isChecked(), true);
    const model = page.getByLabel('Modelo padrão', {exact:true});
    await model.selectOption('qwen3.5-9b-coder:latest');
    await page.waitForFunction(() => document.querySelector('#temperature')?.value === '0.1');
    assert.equal(await page.getByLabel('Temperatura',{exact:true}).isDisabled(),false);
    assert.equal(await page.getByLabel('Janela de contexto',{exact:true}).isDisabled(),false);
    await model.selectOption('gemma4:12b');
    await page.waitForFunction(() => document.querySelector('#temperature')?.value === '1');
    await model.selectOption('qwen3.5-9b-coder:latest');
    await page.waitForFunction(() => document.querySelector('#temperature')?.value === '0.1');
    await automatic.uncheck();
    assert.equal(await page.getByLabel('Temperatura',{exact:true}).isDisabled(),false);
    await automatic.check();
    const viewport = await page.getByLabel('Janela de contexto',{exact:true}).inputValue();
    assert.equal(viewport,String(profiles[0].effectiveNumCtx));
    fs.mkdirSync('artifacts/qa',{recursive:true});
    await page.locator('#settings-panel').evaluate(el=>{el.scrollTop=el.scrollHeight});
    await page.screenshot({path:'artifacts/qa/model-settings-hardware.png',fullPage:true});
    assert.deepEqual(errors,[]);
    const result={checkedAt:new Date().toISOString(),profiles,ui:true,settingsUnchanged:true};
    fs.writeFileSync('artifacts/qa/model-settings.json',JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
