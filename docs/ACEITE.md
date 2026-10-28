# Evidências de aceite

## I01 — base operável de chat local

Data de aceite: 27/10/2026, fuso America/Sao_Paulo. Integração e revisão pelo gerente, com implementação dos agentes Terra Interface, Terra Plataforma e Terra Ollama.

Estado: **aceito para o incremento I01**. F0 e F1 completas não estão aceitas.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Instalação | 257 pacotes instalados, lockfile gerado | package-lock.json |
| Build integrado | Contracts, provider, servidor e frontend compilados | npm run build |
| Tipos | Workspaces sem erros; últimas mudanças também compiladas no build | npm run typecheck --workspaces --if-present |
| Provider | 8 testes passaram | packages/providers/test/ollama.test.mjs |
| Servidor | 7 testes passaram | apps/server/test/server.test.ts |
| Interface | Configuração, modelos, histórico, rename/archive/restore, tema e mobile exercitados | tools/qa/smoke.cjs e relatório local |
| JavaScript no navegador | Nenhum erro observado no cenário de smoke | artifacts/qa/smoke.json |
| Responsividade | 1440×900 e 390×844; composição e botão enviar dentro da largura | Capturas em artifacts/qa |
| Inferência real inicial | HTTP 200, modelo local respondeu OK | tools/diagnostics/inferencia.json |
| Chat real integrado | NDJSON com delta e resposta final OK | artifacts/qa/real-chat.json |
| Persistência real | Conteúdo final recarregado do SQLite idêntico ao stream | tools/qa/real-chat.mjs |
| Cancelamento real | Endpoint confirmou após término; status cancelled persistido | tools/qa/real-chat.mjs |

Os caminhos de artefatos locais de QA são ignorados pelo Git; o resumo desta evidência está versionável neste documento e em [evidencias/i01.json](evidencias/i01.json). Scripts permitem reproduzir os cenários em instância de teste isolada. Nunca executar os cenários mutáveis contra a base pessoal de produção.

### Ambiente observado

Windows, Node 22.22.0, aproximadamente 31,1 GiB de RAM, RTX 4070 de 12 GB, Ollama 0.40.11 e seis modelos listados. Codex CLI disponível, sem comprovar ainda a integração de app-server com ferramentas.

### Ajustes resultantes da revisão

- Turno de mensagens é criado em transação; falha na gravação não prende a geração.
- Cancelamento aguarda gravação do estado final antes de confirmar.
- Desligamento aborta a geração antes de fechar o banco.
- Erro e encerramento inesperado não deixam indicador de streaming indefinido.
- Estado de criação da conversa precede a disponibilidade do botão parar.
- Seletor de tema recebeu nome acessível explícito.
- Dimensões do shell móvel são limitadas para preservar compositor e enviar.
- Perfil recebeu `think`: padrão do modelo, ativado ou desativado quando suportado.

### Limites da evidência

O teste integrado de resposta curta usou `qwen3.5-9b-coder:latest`, contexto 4096 e `think:false`. Em execução aquecida, a resposta OK levou 446 ms e gerou um delta; esse resultado não é benchmark geral nem prova de desempenho para tarefas longas. O probe inicial com carga do modelo levou aproximadamente 61,8 s.

Uma tentativa com configuração de raciocínio padrão permaneceu sem texto visível e foi cancelada. Não se conclui daí que o modelo falhou; a experiência depende da configuração e da carga. O padrão da aplicação continua preservando a escolha do modelo, e o proprietário pode desativar raciocínio no perfil.

Não foram aceitos: agente de programação/ferramentas, edição de projetos, terminal, Git, anexos, múltiplos perfis/servidores persistentes, reconexão de tarefa, autenticação de rede, F0 integral ou F1 integral. SQLite nativo é experimental nesta versão do Node; upgrades do runtime precisam de validação de persistência.

### Próximo incremento

I02: fechar lacunas do chat e da configuração. I03: comprovar o motor com ferramentas antes de abrir execução de comandos/edição. As atribuições seguem o [roadmap](ROADMAP.md) e a [equipe](EQUIPE_AGENTES.md).

## I02 parcial — recomendações por modelo e capacidade do hardware

Data: 27/10/2026. Alteração aceita para o perfil automático; não encerra I02 ou F1.

- Modelfile e capacidades consultados por modelo, com descarte de respostas atrasadas na interface.
- Modo automático ativado por padrão; valores manuais anteriores preservados para uso explícito.
- Temperatura e raciocínio herdados do modelo; contexto ajustado por tamanho dos pesos, RAM/VRAM, residentes e estimativa de KV.
- Contexto reavaliado antes da geração, com margens e teto em presets inferiores; hardware remoto permanece desconhecido.
- Insuficiência estimada para pesos e contexto mínimo resulta em erro persistido, sem chamar a inferência.
- Cancelamento durante a consulta de metadados também foi testado.

Validação: build integrado passou; provider com 14 testes e servidor com 13 testes passaram. `tools/qa/model-settings.cjs` verificou parâmetros de três modelos reais e troca de seleção no navegador sem salvar configurações pessoais.

Snapshot observado: Qwen 9B, 6,59 GB de arquivo, contexto declarado 65.536 → efetivo 32.768; Gemma 12B, 7,56 GB de arquivo, contexto não declarado → efetivo 1.024; JANA, 11,43 GB de arquivo, sem margem estimada para carregar no estado de memória daquele momento. A máquina tinha cerca de 1,5 GB de RAM livre, RTX 4070 de aproximadamente 12 GB e cerca de 5 GB de VRAM livre, além de memória de modelo residente recuperável.

Esses valores descrevem uma medição pontual, não limites permanentes dos modelos nem um benchmark de geração. A validação desta alteração consultou metadados e exerceu a política; não carregou todos os modelos nem comprovou ausência de falta de memória sob qualquer carga. Relatório local: `artifacts/qa/model-settings.json`.

## Revisão — indicação baseada na capacidade total

Data: 27/10/2026. Pedido explícito do proprietário: considerar o total da máquina para fazer a indicação.

O orçamento passou a usar 85% da RAM total e da VRAM total da GPU selecionada. Memória livre e modelos residentes não alteram os valores indicados. A GPU é selecionada pela maior capacidade total. Reservas de pesos/runtime/cache e limite do modelo continuam aplicáveis. Valores livres ficam separados e identificados como informativos na interface.

Validação: build integrado e 14 testes do servidor passaram, incluindo um teste que altera memória livre e residentes mantendo os totais e confirma contexto, capacidade e execução indicados idênticos. Conferência de API/interface com modelos reais passou sem alterar configurações pessoais. Na revisão, Qwen indicou 32K, Gemma 1K e JANA 8K em execução mista estimada. A indicação não comprova disponibilidade imediata sob a carga atual da máquina.

## I02.2 — organização e continuidade das conversas

Aceito em 27/10/2026. Requisitos CHAT-02, CHAT-03 e CHAT-13 atendidos. O incremento não encerra I02/F1.

Entregas: favoritos persistentes no SQLite, ordenação recente/título com favoritos primeiro, rascunhos separados por conversa e nova conversa, recuperação da última conversa, restauração da posição de leitura e ações de editar/repetir com ramificações que preservam a origem. Rascunhos e leitura pertencem ao navegador/dispositivo; sincronização entre dispositivos não está incluída nesta evidência.

Servidor: migração idempotente preserva o esquema legado; pin é validado e persistido; fork copia transacionalmente somente o prefixo anterior ao pedido do usuário, com novos IDs e referências de origem. Falha de cópia faz rollback. A origem em geração não pode ser ramificada.

Verificações: build integrado passou, 17 testes do servidor e 4 testes do novo motor passaram. O navegador verificou rascunhos/reload, favoritos, ordenação, posição de leitura, edição e repetição com inferência real de qwen3.5-9b-coder, preservação do texto em erro de fork e modal em 390×844. Nenhum erro de JavaScript observado. Scripts e relatórios: `tools/qa/seed-conversations.mjs`, `tools/qa/conversations.cjs`, `artifacts/qa/i022.json` e [evidencias/i022.json](evidencias/i022.json).

A migração foi aplicada em localhost:3001 após backup consistente por VACUUM INTO. Backup local: `.data/backups/pre-i022-2026-10-27T18-04-17-794Z.sqlite`. Conferência posterior manteve uma conversa pessoal, modelo selecionado e modo automático. Dados de teste ficaram na base separada `.data/qa-i022`.

Também foi comprovado o motor nativo em fixture isolada: leu e corrigiu dois arquivos e executou teste Node 1/1 em 13,137 s, com 3 etapas de modelo. O relatório [MOTOR.md](../tools/diagnostics/MOTOR.md) delimita a prova. Ferramentas ainda não estão expostas no chat; cancelamento/retomada com inferência real e a integração com projetos continuam pendentes. F0/I03 permanece parcial.

## Revisão visual — botões somente com ícones

Em 27/10/2026, botões de ação da navegação, mensagens, atualização, configurações e edição passaram a exibir somente ícones. Títulos das conversas e rótulos de formulário continuam legíveis; ações preservam nomes acessíveis e dicas de identificação. Ações de mensagem aparecem no hover/foco e permanecem visíveis no toque.

Typecheck e build do frontend passaram. Inspeção no navegador confirmou ausência de texto visível nos botões de ação, abertura/cancelamento da edição, nomes acessíveis e compositor dentro da largura de 390 px, sem enviar mensagens ou salvar configurações pessoais. Captura local: `artifacts/qa/icon-actions-mobile.png`.

## Revisão visual — padrão das mensagens

Em 27/10/2026, pedidos passaram a usar balões compactos à direita e respostas a ocupar a coluna aberta à esquerda. Foram removidos rótulos visuais repetidos de papel/modelo, preservando a identificação acessível; ações continuam em ícones fora dos balões. Texto longo, Markdown, código e tabelas permanecem dentro da largura disponível.

Typecheck e build passaram. QA visual e de geometria em 1440×900 e 390×844, nos temas claro/escuro, confirmou alinhamento, fundo aberto das respostas, ações externas, ausência de corte horizontal e abertura/cancelamento do editor. Nenhum erro de JavaScript. Conteúdo de QA foi interceptado apenas no navegador de teste, sem gravar conversas ou mudar configurações pessoais. Capturas locais: `artifacts/qa/messages-dark-1440.png`, `messages-dark-390.png`, `messages-light-1440.png` e `messages-light-390.png`.

A revisão também corrigiu a precedência CSS que ampliava a coluna no desktop: leitura e compositor medem 760 px em 1440×900. Em 390×844, leitura mede 358 px e compositor 366 px, respeitando suas margens móveis. As quatro combinações de tema e largura foram conferidas novamente após a correção.

## Acesso pela rede local — aplicação pronta, Firewall pendente

Em 27/10/2026, por solicitação explícita do proprietário, esta instalação passou a escutar em `0.0.0.0:3001`, com endereço Ethernet observado `192.168.1.3`. Página e health responderam HTTP 200 pelo IP da LAN; Ollama permaneceu conectado em loopback. Origem externa recebeu HTTP 403.

Build do servidor e 19 testes passaram, incluindo Host/origem LAN, PATCH e streaming. Navegador em 390×844 abriu configurações pelo endereço LAN, carregou as opções de modelo e não apresentou erro de JavaScript, sem gravar dados pessoais. Evidências locais: `artifacts/qa/lan.json` e `artifacts/qa/lan-mobile.png`. Estas verificações partiram da própria máquina; não comprovam uma conexão de outro dispositivo.

O script administrativo `tools/enable-lan-firewall.ps1` foi preparado e teve a sintaxe validada. A elevação por UAC foi solicitada, mas o Windows retornou que a operação foi cancelada pelo usuário; a regra `CodexWebLocal-LAN-3001` não foi criada. A liberação no Firewall permanece pendente da execução do script como administrador. Acesso LAN completo não é declarado aceito. Pareamento, autenticação e HTTPS de OPS-05/F7 permanecem pendentes.

## I02.3 — seções persistentes da barra lateral

Aceito em 27/10/2026 para a fatia de seções de CHAT-04. Projetos vinculados a pastas permanecem pendentes, portanto CHAT-04/F1 não são declarados concluídos.

Entregas: criar e renomear seções, reordená-las com posições contíguas, mover conversas entre elas e Sem seção, e remover seção sem apagar mensagens. Ramificações herdam a seção. Migração idempotente preserva conversas legadas; movimentação, remoção e reordenação são persistidas no SQLite. Favoritos, ordenação recente/título, busca e arquivo continuam funcionando dentro dos grupos.

Build integrado passou. Servidor: 20/20 testes; provider: 14/14 testes; motor: 4/4 testes. O HTTP de loopback das fixtures do provider precisou ser executado fora do sandbox. O navegador verificou seis cenários em base isolada: CRUD/reload/ordem; movimentação e organização; remoção com preservação integral das mensagens; falha de gravação preservando nome digitado; diálogo móvel com foco contido/Escape; falha de carregamento mantendo acesso às conversas e nova tentativa. Temas claro/escuro e larguras 1440×900/390×844 foram inspecionados. Nenhum erro de JavaScript. Scripts: `tools/qa/seed-sections.mjs`, `serve.mjs` e `sections.cjs`. Relatório: [evidencias/i023.json](evidencias/i023.json). Capturas locais em `artifacts/qa/i023-*`.

Versão aplicada ao servidor principal na porta 3001 após backup por VACUUM INTO: `.data/backups/pre-i023-2026-10-27T19-07-55-723Z.sqlite`. A comparação de hashes confirmou configurações, lista de conversas e mensagens pessoais idênticas: uma conversa e quatro mensagens. Nenhuma seção de QA foi criada na base pessoal. A API de seções e health responderam pelo IP LAN na própria máquina; Firewall continua pendente.

### Prova adicional do motor — cancelamento e retomada

Ollama real retornou `cancelled` após aborto da requisição pelo cliente; a retomada de um checkpoint sem pendências concluiu da etapa 2 para 3. Checkpoint com pendência sintética retornou `reconcile`, sem executar ferramenta. Tempo total 1,604 s. O histórico de retomada veio da prova anterior sem a resposta final. Isso não comprova parada imediata do processamento no servidor nem recuperação após queda durante escrita. Evidências e limites em [MOTOR.md](../tools/diagnostics/MOTOR.md); F0/I03 permanece parcial.

## I02.4 — referências visuais, projetos e processamento

Aceito em 27/10/2026 para a fatia visual e de atividades. As quatro capturas fornecidas pelo proprietário orientaram shell, mensagens, compositor e menus. Em 1738×1332 foram medidos: rail 52 px, navegação 276 px, cabeçalho 46 px, leitura/compositor 736 px começando em x=515, compositor 98 px em y=1224 e painel de contexto 300 px em x=1438. Cores e menus foram inspecionados, sem declarar equivalência de todos os pixels ou funcionalidades do produto de referência.

Projetos mostram contagem real de conversas, pasta/repositório opcionais editáveis e fixação persistida. Os campos são metadados; acesso ao sistema de arquivos continua pendente. Menus compactos permitem mover, arquivar e restaurar, preservando mensagens. Cópia de código e resposta tem fallback para origem LAN; respostas podem ser baixadas como Markdown. Layout móvel e tema claro foram conferidos.

Atividades reais de consulta do modelo, avaliação de memória e geração são transmitidas, persistidas e recuperadas após reinício. O contador usa seus horários; expansão/recolhimento e estados de erro/cancelamento foram conferidos. Não são registros de execução de ferramentas ou de raciocínio interno.

Build integrado e 23 testes do servidor passaram. O navegador verificou cinco conjuntos de cenários com persistência, metadados, menus de conversas, código, tema e celular, sem erros de JavaScript. Uma geração real de qwen3.5-9b-coder atualizou o contador de 0 para 1 s, foi cancelada e persistida; um novo turno concluiu. O streaming passou a ceder ao event loop entre fragmentos para permitir o cancelamento mesmo com dados previamente bufferizados. Teste simulado interrompeu antes de esgotar 20.000 fragmentos; na medição real final, clique levou 24 ms e confirmação total na interface 230 ms. A amostra não garante latência nem confirma parada imediata da inferência no servidor Ollama. Uma corrida em que a resposta termina antes do pedido de cancelamento agora reconcilia o resultado terminal sem erro falso.

Relatórios: [evidencias/reference.json](evidencias/reference.json), [evidencias/activity.json](evidencias/activity.json). Scripts: tools/qa/seed-reference.mjs, reference.cjs e activity.cjs. Fixtures permaneceram em .data/qa-reference; capturas em artifacts/qa/reference-*. Nenhuma conversa de QA foi criada na base pessoal.

Aplicado à porta 3001 após backup consistente em .data/backups/pre-i024-2026-10-27T19-39-59-905Z.sqlite. Hashes de configurações, projetos, lista de conversas e mensagens preservados: uma conversa e quatro mensagens. Health confirmou Ollama conectado. F0/F1 e o escopo completo continuam parciais; ferramentas, alterações/diffs, voz e integrações ainda dependem das fases previstas.

## Correção — projetos recolhidos e fechamento dos menus

Em 27/10/2026, projetos passaram a iniciar recolhidos a cada carregamento. Clicar no nome alterna abertura/fechamento da lista e encerra opções abertas; aria-expanded e ícones de pasta acompanham o estado. Em telas estreitas, os menus agora abrem acima/abaixo quando não há espaço lateral, evitando cobrir o botão que deve fechá-los.

Typecheck/build do frontend passaram. Conferência no navegador em 1440 e 390 px validou estado inicial, três ciclos de abrir/fechar, fechamento no segundo clique, clique no nome, Escape, menu perto do rodapé e recolhimento após reload. Sem erros de JavaScript ou gravações na base pessoal; fixtures interceptadas somente no navegador. Evidência local: artifacts/qa/project-toggle.json. A versão compilada está disponível no servidor principal sem necessidade de migração ou reinício.

## I02.5 — anexos de texto/código e imagem

Aceito em 27/10/2026 para CHAT-06 nos formatos suportados. Seleção múltipla, colagem de imagem, arraste, preparação/erro por item, prévia, remoção e download estão disponíveis. Suporte: texto/código UTF-8 e PNG/JPEG/WebP. Até oito arquivos, 256 KiB por texto, 4 MiB por imagem preparada e 8 MiB no total. Imagens originais acima de 20 MiB são recusadas antes da leitura; preparação reduz o maior lado a 1536 px. PDF/Office/compactados ainda não são processados.

Anexos enviados são persistidos em SQLite e preservados no histórico, após reinício e em ramificações com novas identidades. Editar e repetir um pedido reenviam seus anexos. Rascunhos de arquivos são separados por conversa apenas nesta aba e se perdem ao recarregar; isso é informado na interface. Texto do rascunho continua persistente.

Build integrado passou. Testes: servidor 29/29, provider 17/17 e motor 4/4. Incluem validação antes da persistência, imagens grandes, MIME de código, visão, orçamento de contexto, reinício/fork, erro/cancelamento e manutenção de histórico multimodal. O orçamento é uma heurística conservadora, não contagem exata de tokens nem garantia de recursos sob qualquer carga. Mantém o contexto efetivo limitado pelo modelo e pela capacidade total de hardware, sem truncar arquivos.

Oito cenários de navegador passaram com base separada: erros por item e rascunhos separados; texto real no Ollama/download/reload; edição e repetição sem alterar a origem; imagem real reconhecida pelo Qwen; contexto insuficiente sem perda do arquivo; bloqueio de modelo sem visão/troca de modelo/colagem/arraste; oito anexos no celular sem corte; falha HTTP preservando texto e arquivo mesmo sem crypto.randomUUID. A imagem de fixture vermelha foi reconhecida por qwen3.5-9b-coder:latest. Não houve erro de JavaScript. Scripts: tools/qa/seed-attachments.mjs e attachments.cjs. Relatório: [evidencias/attachments.json](evidencias/attachments.json). Captura local: artifacts/qa/attachments-mobile.png.

Prova real adicional verificou recuperação após rejeição por contexto: um arquivo de 6000 caracteres permaneceu no histórico, mas não bloqueou um envio posterior sem anexo nem sua substituição por arquivo menor. O arquivo aceito permaneceu acessível ao modelo no turno seguinte. Script: tools/qa/attachment-recovery.mjs; relatório [evidencias/attachment-recovery.json](evidencias/attachment-recovery.json).

Aplicado à porta 3001 após backup e migração idempotente. Backups locais: .data/backups/pre-i025-2026-10-27T23-45-47-649Z.sqlite e pre-i025-recovery-2026-10-27T23-48-43-190Z.sqlite. As duas comparações confirmaram configurações, projetos, lista de conversas e mensagens pessoais idênticos: cinco conversas e 54 mensagens. As fixtures ficaram apenas em .data/qa-attachments. Menu de anexos foi conferido no servidor principal sem enviar conteúdo pessoal. F1 e o produto completo permanecem parciais.

## Revisão — colagem Markdown e campo expansível

Em 27/10/2026, mensagens do usuário passaram a renderizar Markdown GFM, incluindo títulos, listas, tabelas e blocos de código. A fonte é preservada para copiar/editar/enviar. O compositor oferece Prévia Markdown e Editar Markdown, com colagem text/markdown no range selecionado e suporte a texto mais imagem no mesmo evento. HTML não é executado.

O campo cresce e encolhe com o texto, restauração de rascunho e mudanças de largura/viewport. Medido: 40 px no estado curto e 320 px no teto desktop; no celular aplica também o limite de 35% da janela e rolagem interna. Anexos e prévia compartilham o espaço sem cortar o rodapé, e o menu de anexos permanece clicável.

Typecheck/build do frontend passaram. QA no navegador verificou fonte e cursor, Markdown nas mensagens/prévia, código/tabelas, HTML sem execução, expansão/encolhimento/reload, texto longo com oito anexos, colagem mista e menu móvel. Sem erro de JavaScript. A verificação usou fixtures interceptadas apenas no navegador, sem enviar mensagens nem alterar dados pessoais. Relatório: [evidencias/markdown-composer.json](evidencias/markdown-composer.json). Captura local: artifacts/qa/markdown-composer-mobile.png. A versão compilada está disponível no servidor principal; nenhuma migração ou reinicialização foi necessária.

## Revisão — seletor de modelo no compositor

Em 27/10/2026, o seletor nativo do compositor foi substituído por botão compacto com nome do modelo e seta, seguido de menu flutuante com título Selecionar modelo, modelos reais do Ollama e indicação do modelo atual. O sufixo :latest é omitido apenas no texto visível; o identificador integral permanece no title e nas requisições. O rótulo solto Automático/Manual foi removido do rodapé; a configuração permanece no painel e não é apresentada como esforço de raciocínio.

Menu abre acima do botão com posicionamento limitado à janela, fecha no segundo clique/Escape/clique fora/seleção, e oferece navegação por setas, Home e End. A troca só é refletida após confirmação da API; falha mantém o modelo anterior. Nomes longos usam reticências e título completo; ausência de modelos tem estado explícito.

Typecheck/build do frontend passaram. QA em 1440 e 390 px verificou marcação, dimensões, teclado/foco, fechamento, seleção, erro de API, nomes longos e lista vazia, sem erros de JavaScript. Todas as alterações foram interceptadas no navegador, preservando as configurações pessoais. Relatório: [evidencias/composer-model.json](evidencias/composer-model.json). Capturas locais: artifacts/qa/composer-model-1440.png e composer-model-390.png. Alteração disponível no servidor principal sem migração ou reinício.

## Revisão — Markdown do texto colado e da resposta no corpo da conversa

Em 27/10/2026, após esclarecimento do proprietário, a exibição passou a tratar o conteúdo textual colado e retornado pelo modelo, sem depender de arquivos .md. Markdown comum e blocos marcados como md/markdown são formatados no próprio corpo das mensagens e na prévia; blocos de outras linguagens continuam código. O texto bruto permanece intacto para copiar, editar e enviar. Não há execução de HTML/JSX.

A antiga ação Baixar Markdown da resposta foi substituída por Ver no chat, que foca a resposta formatada já existente, sem criar outra cópia ou painel. Anexos de arquivo mantiveram o comportamento anterior; esta revisão não adiciona um visualizador especial de arquivos.

Typecheck/build passaram. QA somente no navegador em 1440 e 390 px confirmou Markdown simples e cercado nas mensagens de usuário/modelo, tabelas, código normal, fonte preservada, HTML sem execução, colagem/prévia, ausência de duplicação e recolhimento normal das atividades. Zero downloads e zero erros de JavaScript; sem mensagens enviadas ou alterações nos dados pessoais. Relatório: [evidencias/markdown-body.json](evidencias/markdown-body.json). Capturas locais: artifacts/qa/markdown-body-1440.png e markdown-body-390.png. Versão compilada disponível no servidor principal.

## Revisão — recomendações orientativas

Em 27/10/2026, todos os controles de parâmetros ficaram editáveis, inclusive com acompanhamento automático ativo. A primeira edição entra em modo manual e preserva as demais recomendações visíveis. Presets completos e contexto personalizado permitem ultrapassar as indicações, com avisos para temperatura/contexto e sem bloquear o salvamento. O servidor preserva o numCtx manual e tenta gerar mesmo quando a estimativa de memória é insuficiente. A indicação continua baseada na capacidade total da máquina.

Build integrado e 30 testes do servidor passaram, incluindo provider fake recebendo contexto manual acima da estimativa e do limite do modelo, com hardware desconhecido e capacidade insuficiente. QA no navegador verificou edição em automático, transição sem recuperar valores antigos, presets acima da recomendação e salvamento de 12345 tokens com avisos. Nenhuma inferência de contexto excessivo foi disparada na máquina pessoal. Relatório: [evidencias/advisory-settings.json](evidencias/advisory-settings.json); captura: artifacts/qa/advisory-settings.png.

Servidor principal atualizado após backup .data/backups/pre-advisory-settings-2026-10-28T00-35-13-766Z.sqlite. Comparação antes/depois confirmou hashes iguais de configurações, seções e histórico: 7 conversas e 172 mensagens preservadas. Decisão registrada em ADR-011.

## I02.6 — múltiplos servidores Ollama por conversa

Aceito para CFG-02 em 27/10/2026: cadastro/edição/exclusão de endpoints HTTP(S), escolha no compositor, persistência por conversa, retorno ao padrão global e herança em ramificações. Conversas legadas não mudaram de conexão nem receberam dados fictícios. A exclusão de endpoint referenciado e a edição/troca durante geração são rejeitadas explicitamente.

Build integrado e 32 testes do servidor passaram. Prova adicional com dois servidores Ollama HTTP simulados confirmou catálogos/recomendações e respostas distintos, streaming, cancelamento após parcial persistida, nova geração no mesmo endpoint e fork usando o transporte herdado. Relatório: [endpoints-transport.json](evidencias/endpoints-transport.json). Segundo host físico real não estava configurado; não se declara essa validação.

QA com navegador e base separada usou catálogo do Ollama real e verificou CRUD, salvamento de configurações com cadastro vazio, seleção no POST, reload, erro de PATCH conservando escolha, null voltando ao padrão, exclusão referenciada, catálogo offline sem dados antigos, rascunho preservado em erro e listagem indisponível. Desktop 1440 px e móvel 390 px conferidos, sem erros de JavaScript. Uma falha real de DELETE com JSON vazio foi corrigida antes da segunda rodada, que passou. Relatório: [endpoints-ui.json](evidencias/endpoints-ui.json). Capturas locais: artifacts/qa/endpoints-1440.png e endpoints-390.png. Nenhuma inferência ou dado de teste foi enviado ao chat pessoal.

Aplicado à porta 3001 após backup .data/backups/pre-i026-endpoints-2026-10-28T01-01-05-503Z.sqlite. Hashes de configurações, seções, conversas e mensagens permaneceram iguais: 7 conversas e 174 mensagens. Lista pessoal de servidores adicionais começa vazia. Instância de QA encerrada. Próximo incremento: CFG-04, perfis de parâmetros selecionáveis por conversa/projeto.

## Revisão — projetos abertos por padrão

Em 27/10/2026, por nova preferência do proprietário, projetos passam a iniciar expandidos em cada carregamento, substituindo o padrão fechado anterior. Clique no nome continua recolhendo/expandindo, com ícone de pasta e aria-expanded coerentes. Mostrar mais mantém sua função. Nenhuma alteração no histórico ou na persistência.

Typecheck/build frontend e QA no navegador passaram: estado inicial aberto, alternância, Mostrar mais e reload reabrindo. Consultas de projetos/conversas interceptadas no QA, sem gravações na base pessoal. Evidência: [projects-open-default.json](evidencias/projects-open-default.json). Frontend compilado disponível na porta 3001 sem reinício do servidor.

## Revisão — organização das configurações em abas

Em 28/10/2026, o painel foi separado em Conexão, Modelo e Aparência, com cabeçalho, navegação e salvamento fixos e corpo rolável. O cadastro de servidores fica recolhido até adicionar/editar; instruções e diagnóstico de memória ficam em Avançado. Avisos de contexto foram consolidados sem impedir ajustes acima das recomendações. Edições são preservadas entre abas; erros de salvamento ficam no próprio painel. Campos inválidos em abas ocultas direcionam à aba correta.

Typecheck e build frontend passaram. QA em 1440 e 390 px verificou abas/teclado, preservação de rascunhos, avisos orientativos, falha/sucesso de salvar, validação entre abas, cadastro de servidor, ausência de overflow e botão de salvar visível. Relatório: [settings-layout.json](evidencias/settings-layout.json). Regressão de recomendações orientativas também passou. Capturas locais: artifacts/qa/settings-conexao-1440.png e settings-modelo-390.png, além das outras abas nos mesmos tamanhos. Todas as gravações do QA foram interceptadas; configurações e histórico pessoais não foram alterados. Frontend disponível na porta 3001 sem reinício do servidor.

## I02.7 — perfis de modelo por conversa e projeto

Aceito para CFG-04 em 28/10/2026: perfis nomeados persistentes com modelo, instruções, temperatura, contexto, raciocínio e acompanhamento automático; associação a projeto/conversa; ajustes locais e restauração da herança. Prioridade: ajustes locais, perfil da conversa, perfil do projeto, configurações gerais. A troca de modelo no compositor preserva o padrão global e o perfil compartilhado. Ramificações preservam perfil e ajustes. Endpoint continua independente.

Build integrado e 35 testes do servidor passaram, incluindo precedência, parâmetros enviados ao provider, reinício/fork, exclusão referenciada, proteção de geração ativa, think:null e normalização de ajustes vazios. A prova HTTP com Ollama simulado confirmou modelo, instruções, temperatura, think e contexto manual acima dos metadados, além de cancelamento e nova geração. Relatório: [profiles-transport.json](evidencias/profiles-transport.json). Não se declara inferência real nova neste incremento.

QA em banco separado com provider simulado verificou CRUD, perfil de projeto/conversa, ajustes sem alteração do global/perfil, persistência em reload, erro de PATCH conservando seleção, restauração da herança, atualização do perfil com chat aberto, geração simulada, exclusão referenciada, fork, nova conversa e POST com perfil. Relatório: [profiles-ui.json](evidencias/profiles-ui.json). A inspeção visual encontrou e corrigiu envio ausente de profileId na edição de projeto e layout horizontal indevido no modal. A rodada final do modal verificou campos contidos, rolagem, ações alcançáveis, Escape e retorno de foco em 1440/390 px: [profiles-layout.json](evidencias/profiles-layout.json). Capturas locais: artifacts/qa/profiles-1440.png e profiles-adjustments-390.png. A regressão das abas de configurações passou sem erros de JavaScript ou alterações pessoais.

A geração pessoal em andamento foi aguardada até terminar. Backup final: .data/backups/pre-i027-profiles-final-2026-10-28T06-39-26-408Z.sqlite. Após reinício na porta 3001 e migração, hashes de configurações, seções, conversas e mensagens permaneceram idênticos: 8 conversas e 220 mensagens. Perfis pessoais começam vazios; nenhum conteúdo de QA foi inserido. Smoke de leitura no navegador confirmou seleção e gerenciador na instalação pessoal. Instância temporária de QA encerrada. F0/F1 e os demais requisitos do produto permanecem em andamento.

## Revisão — documentação e versionamento inicial

Em 28/10/2026, README e situação atual foram atualizados até I02.7; adicionadas referências da API implementada e de desenvolvimento/atualização, com distinção entre arquitetura entregue e planejada. Backlog regenerado e registro de Markdown alinhado à exibição no chat. Remoto origin configurado para https://github.com/Tauser/openwebui.git.

npm test passou com 56 testes: 35 do servidor, 17 do provider e 4 do runtime. Links locais dos documentos revisados foram conferidos. A seleção inicial para Git contém fontes, lockfile, documentação e evidências selecionadas; .env, bancos, data/.data, backups, logs, dependências, builds e capturas locais de QA permanecem ignorados. Nenhuma mudança de runtime ou reinício do serviço foi necessária para esta revisão.
