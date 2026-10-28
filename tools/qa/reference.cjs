const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3344';
const seed = JSON.parse(fs.readFileSync(path.join(process.env.QA_DATA_DIR || '.data/qa-reference', 'seed.json'), 'utf8'));
const api = async suffix => { const response = await fetch(base + '/api/v1' + suffix); assert.ok(response.ok); return response.json(); };
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1738, height: 1332 } });
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const button = name => page.getByRole('button', { name, exact: true });
  const dialog = () => page.getByRole('dialog');
  const openGroups = async () => { await page.locator('.group-name').first().waitFor(); for (const item of await page.locator('.group-name').all()) if (await item.getAttribute('aria-expanded') === 'false') await item.click(); };
  const projectMenu = async name => { await page.getByRole('region', { name, exact: true }).hover(); await button('Opções do projeto ' + name).click(); await page.locator('.project-popover').waitFor(); };
  fs.mkdirSync('artifacts/qa', { recursive: true });
  try {
    await page.goto(base); await openGroups(); await button(seed.alpha.title).click();
    await page.locator('.msg-code').waitFor();
    const geometry = await page.evaluate(() => Object.fromEntries(['.rail', '.sidebar', '.topbar', '.read-width', '.composer', '.results-panel'].map(selector => { const element = document.querySelector(selector); const rect = element?.getBoundingClientRect(); return [selector, rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, color: getComputedStyle(element).backgroundColor } : null]; })));
    assert.equal(geometry['.rail'].width, 52); assert.equal(geometry['.sidebar'].width, 276);
    assert.equal(geometry['.topbar'].height, 46); assert.equal(geometry['.read-width'].width, 736);
    assert.ok(Math.abs(geometry['.read-width'].x - 515) <= 1);
    assert.ok(Math.abs(geometry['.composer'].height - 98) <= 2);
    assert.equal(geometry['.results-panel'].width, 300);
    assert.equal(geometry['.composer'].color, 'rgb(52, 52, 52)');
    await page.screenshot({ path: 'artifacts/qa/reference-desktop.png' });
    checks.push('Dimensões e alinhamento da referência em 1738×1332');

    await projectMenu(seed.project.name);
    let menu = page.locator('.project-popover');
    const projectCount = (await api('/conversations')).conversations.filter(c => c.sectionId === seed.project.id).length;
    assert.ok((await menu.innerText()).includes(`${projectCount} ${projectCount === 1 ? 'conversa' : 'conversas'}`)); assert.ok((await menu.innerText()).includes(seed.project.folderPath));
    await page.screenshot({ path: 'artifacts/qa/reference-project.png' });
    await page.keyboard.press('Escape'); assert.equal(await menu.count(), 0);
    await projectMenu(seed.noise.name); menu = page.locator('.project-popover');
    assert.ok((await menu.innerText()).includes(seed.noise.repository));
    await menu.getByRole('button', { name: 'Editar projeto', exact: true }).click();
    await page.getByLabel('Pasta (opcional)').fill('D:\\Projetos\\NoiseBot-v3\\workspace');
    await page.getByLabel('Repositório (opcional)').fill('Tauser/NB3-local');
    await dialog().getByRole('button', { name: 'Salvar', exact: true }).click(); await dialog().waitFor({ state: 'detached' });
    let saved = (await api('/sections')).sections.find(s => s.id === seed.noise.id);
    assert.equal(saved.repository, 'Tauser/NB3-local'); assert.equal(saved.folderPath, 'D:\\Projetos\\NoiseBot-v3\\workspace');
    await projectMenu(seed.noise.name);
    if (await button('Desafixar projeto').count()) { await button('Desafixar projeto').click(); await button('Fixar projeto').waitFor(); }
    await button('Fixar projeto').click(); await button('Desafixar projeto').waitFor(); await page.keyboard.press('Escape');
    await page.reload(); await openGroups(); await page.locator('.msg-code').waitFor();
    saved = (await api('/sections')).sections.find(s => s.id === seed.noise.id); assert.equal(saved.pinned, true);
    const order = await page.locator('.sidebar-group').evaluateAll(items => items.map(item => item.getAttribute('aria-label')));
    assert.ok(order.indexOf(seed.noise.name) < order.indexOf(seed.project.name));
    checks.push('Popover com contagem/pasta/repositório reais, edição e fixação persistidas');

    const beforeMove = await api('/conversations/' + seed.alpha.id);
    async function moveConversation(sectionId) {
      await page.locator('.conversation-row').filter({ has: button(seed.alpha.title) }).hover();
      await button('Opções da conversa ' + seed.alpha.title).click();
      await page.locator('.conversation-menu').getByRole('button', { name: 'Mover conversa', exact: true }).click();
      await page.getByLabel('Projeto', { exact: true }).selectOption(sectionId);
      await dialog().getByRole('button', { name: 'Salvar', exact: true }).click();
      await dialog().waitFor({ state: 'detached' });
    }
    await moveConversation(seed.noise.id);
    assert.equal((await api('/conversations/' + seed.alpha.id)).conversation.sectionId, seed.noise.id);
    await moveConversation(seed.project.id);
    assert.deepEqual((await api('/conversations/' + seed.alpha.id)).messages, beforeMove.messages);
    await page.locator('.conversation-row').filter({ has: button(seed.alpha.title) }).hover();
    await button('Opções da conversa ' + seed.alpha.title).click();
    await page.locator('.conversation-menu').getByRole('button', { name: 'Arquivar', exact: true }).click();
    await button(seed.alpha.title).waitFor({ state: 'detached' });
    await button('Opções de projetos').click(); await button('Arquivo').click();
    await button(seed.alpha.title).waitFor();
    await page.locator('.conversation-row').filter({ has: button(seed.alpha.title) }).hover();
    await button('Opções da conversa ' + seed.alpha.title).click();
    await page.locator('.conversation-menu').getByRole('button', { name: 'Restaurar', exact: true }).click();
    await button('Opções de projetos').click(); await button('Ativas').click();
    await button(seed.alpha.title).waitFor();
    checks.push('Menus compactos movem, arquivam e restauram conversas sem alterar mensagens');

    const generator = page.getByRole('region', { name: seed.generator.name, exact: true });
    assert.equal(await generator.locator('.conversation-select').count(), 6);
    await generator.getByRole('button', { name: 'Mostrar mais', exact: true }).click();
    assert.equal(await generator.locator('.conversation-select').count(), 7);
    await generator.getByRole('button', { name: 'Mostrar menos', exact: true }).click();
    await page.locator('.msg-activity-heading').click();
    assert.equal(await page.locator('.msg-activity li').count(), 3);
    assert.match(await page.locator('.msg-activity-heading').innerText(), /Trabalhou por 8 min 51 s/);
    await page.locator('.msg-activity-heading').click();
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
    await button('Copiar código').click(); await button('Copiado').waitFor();
    await button('Mais opções').click();
    const responseCount = await page.locator('.msg-assistant').count();
    await page.getByRole('menuitem', { name: 'Ver no chat' }).click();
    assert.equal(await page.locator('.msg-assistant').count(), responseCount);
    assert.equal(await page.locator('.msg-assistant .msg-markdown').first().evaluate(el => el === document.activeElement), true);
    checks.push('Mostrar mais, atividades recolhíveis, cópia por fallback e leitura de Markdown no chat');

    await page.setViewportSize({ width: 390, height: 844 }); await button('Abrir navegação').click();
    await projectMenu(seed.project.name);
    let box = await page.locator('.project-popover').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844);
    await page.screenshot({ path: 'artifacts/qa/reference-project-mobile.png' });
    await page.keyboard.press('Escape'); assert.equal(await button('Abrir navegação').getAttribute('aria-expanded'), 'true');
    await button('Fechar navegação').last().click();
    await button('Configurações do chat').click();
    await page.getByLabel('Tema', { exact: true }).selectOption('light');
    await button('Salvar configurações').click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await button('Fechar configurações').click();
    const clipping = await page.evaluate(() => ['.main', '.composer', '.send', '.composer-model-trigger'].filter(selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return rect.x < -1 || rect.right > innerWidth + 1; }));
    assert.deepEqual(clipping, []);
    await page.screenshot({ path: 'artifacts/qa/reference-light-mobile.png' });
    await page.setViewportSize({ width: 1738, height: 1332 }); await page.screenshot({ path: 'artifacts/qa/reference-light-desktop.png' });
    checks.push('Popover móvel dentro da tela, Escape, configuração e tema claro sem corte');

    assert.deepEqual(errors, []);
    const report = { checkedAt: new Date().toISOString(), success: true, isolatedDatabase: true, geometry, checks, browserErrors: errors };
    fs.writeFileSync('artifacts/qa/reference.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } catch (error) { await page.screenshot({ path: 'artifacts/qa/reference-failure.png' }); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
