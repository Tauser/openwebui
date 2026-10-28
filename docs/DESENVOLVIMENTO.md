# Desenvolvimento e atualização

Atualizado em 28/10/2026. Repositório: [Tauser/openwebui](https://github.com/Tauser/openwebui). O código fonte é versionado; a aplicação continua sendo executada localmente.

## Instalação

Requer Node.js 22.13 ou superior, npm e Ollama com modelo instalado. O ambiente de referência usa Node 22.22.0. Não há download automático de modelos ou fallback de nuvem.

```powershell
git clone https://github.com/Tauser/openwebui.git
cd openwebui
npm.cmd ci
npm.cmd run build
npm.cmd start
```

O servidor usa a interface compilada em `apps/web/dist` e abre em `http://127.0.0.1:3001`. Os scripts da raiz carregam `.env` quando presente. Copie `.env.example` para `.env` apenas se precisar configurar bind, porta, endereço inicial do Ollama ou diretório dos dados. Configurações persistidas prevalecem sobre a URL inicial do ambiente.

## Trabalhar no código

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run roadmap:sync
```

O modo dev usa API na porta 3001 e Vite na 5173. Testes de provider criam servidores temporários em loopback. Os probes em `tools/diagnostics` distinguem inferência real, motor isolado e servidores simulados; leia o cabeçalho antes de executá-los. A QA de navegador usa Playwright disponível no ambiente e bases descartáveis em `.data`; não deve ser executada contra o banco pessoal quando o script cria registros.

Responsabilidades e limites de trabalho estão em [AGENTS.md](../AGENTS.md) e [EQUIPE_AGENTES.md](EQUIPE_AGENTES.md). Mudanças de contrato passam pelo integrador. Atualize [progresso.json](progresso.json), gere o backlog e registre evidências antes de aceitar uma entrega.

## Git

O remoto `origin` deve apontar para `https://github.com/Tauser/openwebui.git`. Para novas alterações, prefira branches `codex/<tarefa>`. Revise a seleção de arquivos antes de criar commits e sincronize sem reescrever o histórico remoto.

```powershell
git status
git remote -v
git fetch origin
```

Para atualizar uma instalação sem alterações locais, use `git pull --ff-only`, execute `npm.cmd ci` e `npm.cmd run build` e reinicie o processo do servidor. Com alterações locais, revise e preserve seu trabalho antes de integrar; não use reset/clean para descartar arquivos automaticamente.

## Dados e atualização da instalação pessoal

O banco padrão é `data/codex-local.sqlite`, relativo ao diretório em que o servidor foi iniciado. `CODEX_LOCAL_DATA_DIR` pode alterar essa localização. No workspace atual a raiz é `D:\Projetos\OpenwebUi`.

Antes de aplicar uma migração, aguarde as gerações terminarem e crie um backup consistente do SQLite. `tools/qa/upgrade-snapshot.mjs before` faz backup e registra hashes das configurações e do histórico da instalação padrão; `after` compara esses hashes. Use `UPGRADE_ID` novo a cada atualização. Esse helper destina-se à instalação pessoal padrão, não a uma API de backup do produto.

Não copie somente o arquivo principal de um banco SQLite ativo em WAL esperando um backup consistente. Use o helper ou pare o servidor antes de uma cópia manual. Depois de compilar, alterações apenas no frontend são servidas diretamente; alterações no backend exigem reinício. Helpers persistentes em background no Windows devem iniciar com janela oculta.

`.gitignore` exclui `.env`, bancos SQLite, `data`, `.data`, backups, logs, dependências, builds e capturas locais de QA. `.env.example`, fontes, documentação e relatórios de aceite selecionados são versionados. Não inclua conversas, anexos pessoais ou credenciais em commits.

## Estado da entrega

O marco atual é I02.7: perfis por conversa/projeto, além de múltiplos servidores, chat, Markdown e anexos. O motor de programação ainda é uma prova isolada: editor, terminal e execução de ferramentas no chat permanecem pendentes. Consulte [ROADMAP.md](ROADMAP.md), [BACKLOG.md](BACKLOG.md) e [ACEITE.md](ACEITE.md).
