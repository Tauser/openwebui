const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3344';
const directory = process.env.QA_DATA_DIR || '.data/qa-attachments';
const seed = JSON.parse(fs.readFileSync(path.join(directory, 'seed.json'), 'utf8'));
const api = async suffix => { const r = await fetch(base + '/api/v1' + suffix); assert.ok(r.ok); return r.json(); };
const file = name => path.resolve(directory, name);
const png = fs.readFileSync(file('vermelho.png'));
const originalText = fs.readFileSync(file('notas.txt'), 'utf8');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const button = name => page.getByRole('button', { name, exact: true });
  const input = () => page.getByLabel('Selecionar anexos', { exact: true });
  const composer = () => page.getByRole('textbox', { name: 'Mensagem', exact: true });
  const selectModel = async name => { await button('Selecionar modelo').click(); await page.getByRole('menuitemradio').and(page.getByTitle(name, { exact: true })).click(); };
  const ready = async count => { await page.waitForFunction(n => { const items = [...document.querySelectorAll('.attachment-chip')]; return items.length === n && items.every(el => el.textContent.includes('Pronto')); }, count); };
  const current = async () => api('/conversations/' + await page.evaluate(() => localStorage.getItem('last-conversation')));
  const settle = async () => page.waitForFunction(() => document.querySelector('.composer-hint')?.textContent?.includes('Enter para enviar'), null, { timeout: 180000 });
  const open = async title => { const group = button('Sem projeto'); if (await group.getAttribute('aria-expanded') === 'false') await group.click(); await button(title).click(); await page.waitForFunction(expected => document.querySelector('.top-title')?.textContent === expected, title); };
  const fresh = async () => { await page.locator('.new-chat').click(); };
  const clear = async () => { const items = page.getByRole('button', { name: /^Remover / }); while (await items.count()) await items.first().click(); };
  try {
    await page.goto(base); await input().waitFor({ state: 'attached' }); await open(seed.alpha.title);
    await button('Adicionar').click(); await page.getByRole('menuitem', { name: 'Anexar arquivos', exact: true }).waitFor();
    await page.keyboard.press('Escape'); assert.equal(await button('Adicionar').getAttribute('aria-expanded'), 'false');
    await input().setInputFiles([file('documento.pdf'), file('binario.txt')]);
    await page.getByText(/Formato não suportado/).waitFor(); await page.getByText(/UTF-8 válido|dados binários/).waitFor();
    assert.equal(await button('Enviar mensagem').isDisabled(), true); await clear();
    await input().setInputFiles([file('notas.txt'), file('exemplo.ts')]); await ready(2);
    await open(seed.beta.title); assert.equal(await page.locator('.attachment-chip').count(), 0);
    await input().setInputFiles(file('exemplo.ts')); await ready(1);
    await open(seed.alpha.title); await ready(2); await button('Remover exemplo.ts').click();
    checks.push('Menu de anexos, erros por arquivo e rascunhos separados por conversa');

    await composer().fill('Responda somente o valor de CODIGO_VALIDACAO contido no arquivo anexado. /no_think');
    await button('Enviar mensagem').click(); await settle();
    let alpha = await current(); assert.equal(alpha.conversation.id, seed.alpha.id);
    assert.equal(alpha.messages.at(-1).status, 'complete'); assert.match(alpha.messages.at(-1).content, /ANEXO-LOCAL-7429/);
    assert.equal(alpha.messages[0].attachments[0].text, originalText);
    const downloading = page.waitForEvent('download'); await button('Baixar notas.txt').click();
    assert.equal(fs.readFileSync(await (await downloading).path(), 'utf8'), originalText);
    await page.reload(); await button('Baixar notas.txt').waitFor();
    assert.equal(await page.locator('.attachment-chip').count(), 0);
    checks.push('Texto real no Ollama, download e anexo enviado preservado após reload');

    const originalMessages = (await api('/conversations/' + seed.alpha.id)).messages;
    await button('Editar mensagem').click(); await page.locator('#edit-message').fill('Qual é o valor exato de CODIGO_VALIDACAO no anexo? Responda só esse valor. /no_think');
    await button('Enviar em nova conversa').click(); await settle();
    let fork = await current(); assert.equal(fork.conversation.parentId, seed.alpha.id); assert.equal(fork.messages[0].attachments[0].text, originalText);
    assert.match(fork.messages.at(-1).content, /ANEXO-LOCAL-7429/);
    await button('Tentar novamente').last().click(); await settle();
    fork = await current(); assert.equal(fork.messages[0].attachments[0].text, originalText);
    assert.deepEqual((await api('/conversations/' + seed.alpha.id)).messages, originalMessages);
    checks.push('Edição e repetição preservam o arquivo e não alteram a origem');

    await fresh(); await input().setInputFiles({ name: 'amostra.png', mimeType: 'image/png', buffer: png }); await ready(1);
    await composer().fill('Qual é a cor predominante da imagem? Responda em uma palavra. /no_think');
    await button('Enviar mensagem').click(); await settle();
    const visual = await current(); assert.equal(visual.messages.at(-1).status, 'complete');
    assert.match(visual.messages.at(-1).content.toLowerCase(), /vermelh|red/);
    assert.equal(visual.messages[0].attachments[0].width, 192); assert.equal(visual.messages[0].attachments[0].height, 128);
    await page.getByAltText('Imagem anexada: amostra.png').waitFor();
    checks.push('Imagem real enviada ao Qwen com visão, reconhecida e persistida');

    await fresh(); await input().setInputFiles({ name: 'grande.txt', mimeType: 'text/plain', buffer: Buffer.from('x'.repeat(6000)) }); await ready(1);
    await composer().fill('Resuma o arquivo.'); await button('Enviar mensagem').click(); await settle();
    await page.getByRole('alert').filter({ hasText: 'excedem o contexto' }).waitFor();
    assert.equal(await composer().inputValue(), 'Resuma o arquivo.'); await button('Remover grande.txt').waitFor();
    const excessive = await current(); assert.equal(excessive.messages[0].attachments[0].text.length, 6000); assert.equal(excessive.messages.at(-1).status, 'error');
    checks.push('Contexto insuficiente gera erro sem truncar arquivo nem perder o rascunho');

    await fresh(); await input().setInputFiles({ name: 'visao.png', mimeType: 'image/png', buffer: png }); await ready(1);
    await selectModel('JANA:latest');
    await page.getByText(/Modelo sem suporte a visão/).waitFor(); assert.equal(await button('Enviar mensagem').isDisabled(), true);
    await selectModel('qwen3.5-9b-coder:latest'); await ready(1); await clear();
    await page.evaluate(data => { const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)); const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'colada.png', { type: 'image/png' })); document.querySelector('textarea[aria-label="Mensagem"]').dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true })); }, png.toString('base64'));
    await ready(1); await button('Remover colada.png').click();
    await page.evaluate(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['const valor = 42;'], 'arrastado.ts', { type: 'text/plain' })); document.querySelector('.composer').dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true })); });
    await ready(1); await button('Remover arrastado.ts').click();
    checks.push('Modelo sem visão bloqueado; troca de modelo, colagem e arraste funcionam');

    await input().setInputFiles(Array.from({ length: 9 }, (_, i) => ({ name: `item-${i}.txt`, mimeType: 'text/plain', buffer: Buffer.from('teste') })));
    await ready(8); await page.getByRole('alert').filter({ hasText: 'excedentes não foram lidos' }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('#navigation').getBoundingClientRect().right <= 1);
    const clipping = await page.evaluate(() => ['.composer', '.send', '.composer-model-trigger'].filter(selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1; }));
    assert.deepEqual(clipping, []); fs.mkdirSync('artifacts/qa', { recursive: true });
    await page.screenshot({ path: 'artifacts/qa/attachments-mobile.png', animations: 'disabled' }); await clear();
    checks.push('Limite de oito anexos e compositor móvel sem corte');

    await page.setViewportSize({ width: 1440, height: 1000 }); await fresh();
    await input().setInputFiles(file('notas.txt')); await ready(1); await composer().fill('Rascunho mantido na falha.');
    await page.evaluate(() => Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined }));
    await page.route('**/api/v1/conversations', route => route.request().method() === 'POST' ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Falha QA ao criar conversa"}' }) : route.continue());
    await button('Enviar mensagem').click(); await settle(); await page.getByRole('alert').filter({ hasText: 'Falha QA' }).waitFor();
    assert.equal(await composer().inputValue(), 'Rascunho mantido na falha.'); await ready(1); await button('Remover notas.txt').waitFor();
    await page.unroute('**/api/v1/conversations'); assert.deepEqual(errors, []);
    checks.push('Falha HTTP preserva texto e anexo mesmo sem crypto.randomUUID');
    const report = { checkedAt: new Date().toISOString(), success: true, realOllama: true, visionModel: 'qwen3.5-9b-coder:latest', isolatedDatabase: true, checks, browserErrors: errors };
    fs.writeFileSync('artifacts/qa/attachments.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } catch (error) { fs.mkdirSync('artifacts/qa', { recursive: true }); await page.screenshot({ path: 'artifacts/qa/attachments-failure.png' }); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
