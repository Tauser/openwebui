// Dados de referência apenas na base isolada de QA; nunca no histórico pessoal.
import { Store } from '../../apps/server/dist/store.js';
import fs from 'node:fs';
import path from 'node:path';
const directory = path.resolve(process.env.QA_DATA_DIR || '.data/qa-reference');
if (!directory.startsWith(path.resolve('.data') + path.sep)) throw new Error('Use uma pasta dentro de .data/.');
if (fs.existsSync(path.join(directory, 'codex-local.sqlite'))) throw new Error('Fixture existente não será sobrescrita.');
const store = new Store(directory);
store.saveSettings({ ...store.settings(), model: 'qwen3.5-9b-coder:latest', theme: 'dark', followModelDefaults: false, numCtx: 4096, think: false });
const project = store.createSection('open web UI', { folderPath: 'D:\\Projetos\\OpenwebUi' });
const alpha = store.create('Planejar Codex web com Ollama', project.id);
store.addMessage(alpha.conversation.id, 'user', 'Próximo.passo', 'complete');
const answer = store.addMessage(alpha.conversation.id, 'assistant', 'As seções da barra lateral permitem organizar suas conversas.\n\n- Criar, renomear e ordenar projetos.\n- Mover conversas sem perder mensagens.\n\nO comando abaixo configura a porta de acesso local:\n\n```powershell\n& "D:\\Projetos\\OpenwebUi\\tools\\enable-lan-firewall.ps1"\n```\n\nOs parâmetros de contexto continuam seguindo a capacidade total de memória.', 'complete', 'qwen3.5-9b-coder:latest');
const start = Date.now() - 531000;
answer.activities = [
  { id: 'reference-model', kind: 'model', label: 'Consultando informações do modelo', status: 'complete', startedAt: new Date(start).toISOString(), completedAt: new Date(start + 1000).toISOString() },
  { id: 'reference-hardware', kind: 'hardware', label: 'Avaliando capacidade de memória', status: 'complete', startedAt: new Date(start + 1000).toISOString(), completedAt: new Date(start + 2000).toISOString() },
  { id: 'reference-generation', kind: 'generation', label: 'Gerando resposta', status: 'complete', startedAt: new Date(start + 2000).toISOString(), completedAt: new Date(start + 531000).toISOString() },
];
store.updateMessage(answer);
const noise = store.createSection('Noisebot v.3', { folderPath: 'D:\\Projetos\\NoiseBot-v3', repository: 'Tauser/NB3' });
store.create('Analisar nova versão do NoiseBot', noise.id);
const generator = store.createSection('gerador de imagens e vídeos');
for (const title of ['Recrie o ambiente dos vídeos', 'Investigue resposta inválida no gerador', 'Verificar troca de personagem', 'Atualiza o Git', 'Localize nova versão do Studio', 'Inspecionar parâmetros', 'Conferir geração de vídeo']) store.create(title, generator.id);
for (const name of ['Companion', 'NP2', 'faculdade', 'NP', 'câmera', 'Eyes']) {
  const group = store.createSection(name);
  store.create('Conversa de referência: ' + name, group.id);
}
store.close();
fs.writeFileSync(path.join(directory, 'seed.json'), JSON.stringify({ project, alpha: alpha.conversation, noise, generator }, null, 2));
console.log(`Fixture visual isolada: ${directory}`);
