// Fluxos reais de organização em uma base isolada, sem inferência ou dados pessoais.
const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3344';
const { alpha, beta } = JSON.parse(fs.readFileSync(path.join(process.env.QA_DATA_DIR || '.data/qa-i023', 'seed.json'), 'utf8'));
const api = async suffix => { const response = await fetch(base + '/api/v1' + suffix); assert.ok(response.ok); return response.json(); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const button = name => page.getByRole('button', { name, exact: true });
  const dialog = () => page.getByRole('dialog');
  const save = async () => { await dialog().getByRole('button', { name: 'Salvar', exact: true }).click(); await dialog().waitFor({ state: 'detached' }); };
  const create = async name => { await button('Criar seção').click(); await page.getByLabel('Nome da seção').fill(name); await save(); };
  const group = name => page.getByRole('region', { name, exact: true });
  const action = async (title, name) => { await button(title).hover(); await button(name).click(); };
  const move = async (title, id) => { await action(title, 'Mover conversa ' + title); await page.getByLabel('Seção', { exact: true }).selectOption(id); await save(); };
  try {
    const original = await api('/conversations/' + alpha.id);
    await page.goto(base);
    await button('Criar seção').waitFor();
    await create('Trabalho'); await create('Pessoal');
    let sections = (await api('/sections')).sections;
    const work = sections.find(s => s.name === 'Trabalho');
    const personal = sections.find(s => s.name === 'Pessoal');
    await button('Renomear seção Trabalho').click(); await page.getByLabel('Nome da seção').fill('Código'); await save();
    await button('Mover seção Pessoal para cima').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.sidebar-group')].map(el => el.getAttribute('aria-label')).join('|') === 'Sem seção|Pessoal|Código');
    await page.reload(); await button('Mover seção Pessoal para baixo').waitFor();
    assert.deepEqual((await api('/sections')).sections.map(s => [s.name, s.position]), [['Pessoal', 0], ['Código', 1]]);
    checks.push('Criar, renomear e reordenar seções; persistência após reload');

    await button(alpha.title).click(); await page.getByRole('heading', { name: alpha.title, exact: true }).waitFor();
    await move(alpha.title, work.id);
    assert.equal((await api('/conversations/' + alpha.id)).conversation.sectionId, work.id);
    await group('Código').getByRole('button', { name: alpha.title, exact: true }).waitFor();
    await page.reload(); await group('Código').getByRole('button', { name: alpha.title, exact: true }).waitFor();
    await action(beta.title, 'Fixar ' + beta.title); await button('Desafixar ' + beta.title).waitFor();
    await page.getByLabel('Ordenar conversas', { exact: true }).selectOption('title');
    await page.getByLabel('Pesquisar conversas').fill('Alpha');
    assert.equal(await button(beta.title).count(), 0); await button(alpha.title).waitFor();
    await page.getByLabel('Pesquisar conversas').fill('');
    await action(alpha.title, 'Arquivar ' + alpha.title); await button(alpha.title).waitFor({ state: 'detached' });
    await button('Arquivo').click(); await group('Código').getByRole('button', { name: alpha.title, exact: true }).waitFor();
    await action(alpha.title, 'Restaurar ' + alpha.title); await button('Ativas').click(); await button(alpha.title).waitFor();
    checks.push('Mover conversa selecionada, favoritos, pesquisa, ordenação e arquivo nos grupos');

    await button('Remover seção Código').click();
    assert.match(await dialog().innerText(), /não serão excluídas/);
    await dialog().getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal((await api('/conversations/' + alpha.id)).conversation.sectionId, work.id);
    await button('Remover seção Código').click();
    await dialog().getByRole('button', { name: 'Confirmar remoção', exact: true }).click();
    await dialog().waitFor({ state: 'detached' });
    await group('Sem seção').getByRole('button', { name: alpha.title, exact: true }).waitFor();
    const after = await api('/conversations/' + alpha.id);
    assert.equal(after.conversation.sectionId, undefined); assert.deepEqual(after.messages, original.messages);
    checks.push('Confirmação de remoção e preservação integral das mensagens');

    await page.route('**/api/v1/sections', route => route.request().method() === 'POST' ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Falha de teste ao salvar"}' }) : route.continue());
    await button('Criar seção').click(); await page.getByLabel('Nome da seção').fill('Nome preservado');
    await dialog().getByRole('button', { name: 'Salvar', exact: true }).click(); await dialog().getByRole('alert').waitFor();
    assert.equal(await page.getByLabel('Nome da seção').inputValue(), 'Nome preservado');
    assert.equal(await page.getByLabel('Nome da seção').getAttribute('maxlength'), '80');
    await dialog().getByRole('button', { name: 'Cancelar', exact: true }).click(); await page.unroute('**/api/v1/sections');
    checks.push('Falha de gravação mantém diálogo e nome digitado');

    await page.setViewportSize({ width: 390, height: 844 }); await button('Abrir navegação').click();
    await move(beta.title, personal.id);
    await button('Mover conversa ' + beta.title).click();
    let box = await dialog().boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 390);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await dialog().evaluate(el => el.contains(document.activeElement)), true);
    await page.keyboard.press('Escape'); assert.equal(await dialog().count(), 0);
    assert.equal(await button('Abrir navegação').getAttribute('aria-expanded'), 'true');
    assert.equal(await button('Mover conversa ' + beta.title).evaluate(el => el === document.activeElement), true);
    const titleWidth = await group('Pessoal').locator('.conversation-select').evaluate(el => el.getBoundingClientRect().width);
    assert.ok(titleWidth >= 150, `Título com apenas ${titleWidth}px`);
    checks.push('Diálogo móvel dentro da tela, foco contido e Escape preserva navegação');

    fs.mkdirSync('artifacts/qa', { recursive: true });
    await page.screenshot({ path: 'artifacts/qa/i023-dark-390.png' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    await page.screenshot({ path: 'artifacts/qa/i023-light-390.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'artifacts/qa/i023-light-1440.png' });

    await page.route('**/api/v1/sections', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Seções indisponíveis na fixture"}' }));
    await page.reload(); await group('Seção indisponível').getByRole('button', { name: beta.title, exact: true }).waitFor();
    await page.unroute('**/api/v1/sections'); await button('Tentar carregar seções').click();
    await group('Pessoal').getByRole('button', { name: beta.title, exact: true }).waitFor();
    checks.push('Falha ao carregar seções mantém conversas acessíveis e permite tentar novamente');
    assert.deepEqual(errors, []);
    const report = { checkedAt: new Date().toISOString(), success: true, isolatedDatabase: true, checks, browserErrors: errors };
    fs.writeFileSync('artifacts/qa/i023.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } catch (error) {
    fs.mkdirSync('artifacts/qa', { recursive: true }); await page.screenshot({ path: 'artifacts/qa/i023-failure.png' }); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
