# Roadmap executável

Versão 1 · 27/10/2026 · Gerência: agente principal · Implementação: equipe Terra.

## Fontes e acompanhamento

Escopo: [152 requisitos](ESCOPO_FUNCIONAL.md), [26 telas e 13 requisitos visuais](ESPECIFICACAO_VISUAL.md). Equipe: [EQUIPE_AGENTES.md](EQUIPE_AGENTES.md). Estado por requisito: [BACKLOG.md](BACKLOG.md). O backlog é gerado por `npm run roadmap:sync` a partir do escopo e de `docs/progresso.json`.

Estados: planejado, em andamento, em validação, aceito, aguardando configuração e falhou. Sem porcentagem de conclusão baseada somente em quantidade de arquivos ou linhas.

## Situação atual

**I01 aceito em 27/10/2026.** Build integrado, tipos, 15 testes e smoke visual passaram. Streaming, persistência e cancelamento foram exercitados com `qwen3.5-9b-coder:latest` no Ollama real. Evidências: [ACEITE.md](ACEITE.md).

**I02.2 aceito em 27/10/2026:** favoritos/ordenação, rascunhos/leitura e edição/repetição em ramificações foram validados e aplicados ao servidor local. CHAT-02, CHAT-03 e CHAT-13 aceitos. A base pessoal foi copiada antes da migração e seus dados/configurações preservados.

**I02.3 aceito em 27/10/2026:** seções persistentes da barra lateral, movimentação de conversas, ordenação e remoção sem perda de mensagens. A versão foi aplicada após backup e comparação dos dados pessoais. CHAT-04 permanece parcial: projetos vinculados a pastas continuam pendentes.

**I02.4 aceito em 27/10/2026:** shell e mensagens baseados nas capturas fornecidas, menus de projetos com metadados reais e atividades persistidas da geração. Medidas principais conferidas no navegador; geração, contador e cancelamento validados com Ollama real. Aplicado após backup e comparação dos dados pessoais. Ferramentas do motor e acesso a arquivos continuam pendentes.

**I02.5 aceito em 27/10/2026 para os formatos suportados:** anexos de texto/código e imagem, colagem/arraste, persistência e ramificações validados com Ollama real. Limites, perda de rascunhos de anexos ao recarregar e processadores pendentes estão registrados em ACEITE.md.

**I02.6 aceito em 27/10/2026:** múltiplos servidores Ollama e seleção persistida por conversa. **I02.7 aceito em 28/10/2026:** perfis por projeto/conversa, ajustes locais e restauração da herança. O código fonte e esta documentação são mantidos em [Tauser/openwebui](https://github.com/Tauser/openwebui).

F0 continua em andamento: a prova nativa isolada com ferramentas e a prova limitada de cancelamento/retomada com Ollama passaram, mas faltam integração com chat/projetos, recuperação de efeitos pendentes e conclusão da escolha do motor. I02.6 entrega múltiplos servidores e I02.7 perfis por conversa/projeto; F1 continua em andamento com outras lacunas de I02 pendentes. O produto completo permanece em implementação.

I02 parcial: presets de contexto e perfil automático por modelo/hardware implementados e validados. Por preferência do proprietário, a indicação usa capacidade total de RAM/VRAM com reserva, pesos e cache estimado; memória livre é apenas informativa. Conforme ADR-011, recomendações são orientativas: valores manuais são preservados e estimativas excedidas geram avisos. Evidências e limitações estão em ACEITE.md; as demais lacunas de I02 permanecem no backlog.

## Marcos e dependências

| Marco | Entrega verificável | Depende de | Estado inicial |
| --- | --- | --- | --- |
| F0 Diagnóstico | Inventário de hardware/modelos, probe do motor e decisão documentada | Ambiente do proprietário | Diagnóstico e provas isoladas aceitos; integração/decisão pendentes |
| F1 Base web | Shell, temas, chat/configuração persistentes e conectividade Ollama | Contratos e diagnóstico básico | Em andamento |
| F2 Programação | Pedido → leitura → alteração → teste → resultado, com parar | F1 e motor validado | Planejado |
| F3 Consolidação | Git, worktrees, revisão, memória e recuperação | F2 | Planejado |
| F4 Extensibilidade | Skills, hooks, MCP, plugins, agentes e agendas | F3 e fila de recursos | Planejado |
| F5 Operação visual | Browser, pesquisa, desktop, preview e replay | F3; infraestrutura de execução | Planejado |
| F6 Multimodal | Voz, imagens e documentos com backends reais | F4 e gestão de recursos | Planejado |
| F7 Integrações | Conectores, publicação, hosts, API/CLI e PWA | Bases anteriores por recurso | Planejado |
| F8 Aceite integral | Instalação limpa, offline, backup, desempenho e acessibilidade | Todos os requisitos de entrega | Planejado |

F1 pode avançar com Ollama offline, mas a validação real de inferência e a conclusão de F0 não podem ser declaradas sem serviço/modelo disponíveis. F0 não bloqueia construir estados vazios, persistência ou shell visual.

## Incremento I01 — primeira base operável

Estado: **aceito**, sem equivaler à conclusão de F0/F1. Ver registro de validação.

Objetivo: iniciar o servidor e abrir uma interface web local com histórico persistente, configurações, modelos reais, streaming e cancelamento. É uma fatia de F0/F1, não todo o produto nem um agente de programação completo.

| Trabalho | Responsável | Evidência esperada |
| --- | --- | --- |
| Workspace, contratos, scripts e configuração | Gerente | Instalação e comandos unificados |
| Diagnóstico de Node/RAM/GPU/Ollama/Codex | Terra Ollama | Relatório com resultado observado e pendências |
| Provider Ollama e NDJSON | Terra Ollama | Testes de stream fragmentado, erro e cancelamento |
| SQLite, configurações e conversas | Terra Plataforma | Reabrir estado persistido e validar entradas |
| Geração/stop e limites de concorrência | Terra Plataforma | Stream incremental e parcial persistida após interrupção |
| Shell, temas, histórico e compositor | Terra Interface | Fluxo utilizável em desktop e celular, sem conteúdo fictício |
| Integração, build e revisão | Gerente | Typecheck, build, testes e inspeção da interface |

Aceite I01: UI e API inicializam; conexão configurável; offline tem mensagem real; histórico sobrevive a reinício; testes do provider/backend passam; build e tipos passam; navegação/tema/compositor funcionam. Inferência real só pode ser aceita com um modelo local disponível; testes com servidor fake não equivalem a isso.

## Incrementos seguintes

### I02.5 — anexos e colagem

Estado: **aceito para os formatos suportados**. CHAT-06: anexar texto/código UTF-8 e PNG/JPEG/WebP, colar/arrastar imagens, exibir preparação/erro e permitir remoção. Persistir anexos junto às mensagens e preservá-los no histórico, edição e repetição. Imagens dependem de suporte a visão declarado pelo modelo. Estimar contexto pelo conteúdo e pela configuração efetiva limitada ao hardware total, sem truncar arquivos silenciosamente.

Limites desta fatia: até oito anexos, 256 KiB por texto, 4 MiB por imagem preparada e 8 MiB no total. Imagens são otimizadas no navegador; o servidor revalida bytes, formato e dimensões. PDF, documentos Office e arquivos compactados dependem dos processadores de F6. Rascunhos de anexos são mantidos por conversa apenas nesta aba; o texto continua persistente. A perda ao recarregar será informada na interface.

Terra Interface implementa os fluxos visuais; Terra Plataforma valida/persiste e integra ao chat; Terra Ollama prepara mensagens multimodais e estima o contexto. Gerente integra e testa em base isolada antes da migração pessoal.

Evidência: build integrado, 29 testes do servidor, 17 do provider e 4 do motor passaram. O navegador verificou oito cenários, incluindo inferência real de texto/imagem, edição/repetição, visão, erros e uso móvel. Uma prova real adicional confirmou recuperação após rejeição de contexto, sem apagar o arquivo rejeitado do histórico. Versão aplicada após backup e comparação dos dados pessoais. Próximo incremento de F1: múltiplos endpoints e perfis Ollama (CFG-02/04).

### I02.4 — interface baseada nas capturas fornecidas

Estado: **aceito para a fatia visual e de atividades**. Shell, navegação, projetos e menus, mensagens, código e compositor seguem as quatro capturas fornecidas pelo proprietário. Os projetos admitem metadados opcionais de pasta/repositório e fixação persistida, sem acesso a arquivos. Atividades reais do servidor mostram consulta do modelo, avaliação de memória e geração com contador de tempo, expansão e estado final.

Aceite exige build, testes de persistência/erro/cancelamento, comparação das medidas no navegador, menus e uso móvel, geração real com interrupção e preservação dos dados pessoais após a migração. Escopo avançado de ferramentas, diffs e voz permanece pendente.

Evidência obtida: build integrado, 23 testes do servidor, cinco cenários de navegador e geração real com contador, cancelamento e novo turno concluído. Na medição final isolada, o cancelamento foi confirmado na interface em 230 ms; isso não é uma garantia de latência nem prova de parada imediata do processamento no Ollama. Detalhes: [ACEITE.md](ACEITE.md).

### I02.3 — seções da barra lateral

Estado: **aceito para a fatia de seções**. Criar, renomear, reordenar e remover seções; mover conversas entre seções e Sem seção; persistir a organização no SQLite, incluindo ramificações. Remover seção preserva suas conversas e mensagens. A interface mantém favoritos, ordenação, pesquisa e arquivo, com ações por ícones e funcionamento móvel.

Terra Plataforma mantém migração e API; Terra Interface implementa os fluxos; gerente mantém contratos e valida em base separada antes de aplicar à instalação pessoal. Seções são agrupamentos de conversas. Projetos associados a pastas, arquivos e ferramentas continuam pendentes; esta fatia não encerra CHAT-04.

Build integrado, 20 testes do servidor, 14 do provider, 4 do motor e seis cenários de navegador passaram. QA em base separada comprovou preservação de mensagens, falhas de gravação/carregamento e diálogo móvel com foco/Escape. Versão aplicada à porta 3001 após backup; dados e configurações pessoais mantiveram hashes idênticos. Evidências: [ACEITE.md](ACEITE.md).

Em paralelo, Terra Ollama validou cancelamento da requisição e retomada de histórico real em fixture isolada. Efeitos pendentes exigem reconciliação e o executor não está exposto no chat. Próximo marco de F1: anexos e colagem (CHAT-06) e múltiplos endpoints/perfis (CFG-02/04); em F0/I03, contrato de workspace e eventos do motor.

### I02.2 — organização e continuidade do chat

Escopo atribuído: favoritos e ordenação (CHAT-03); rascunhos e posição de leitura (CHAT-13); repetir/editar pedido por ramificação, preservando origem (CHAT-02). Terra Plataforma implementa migração, pin e fork; Terra Interface implementa os fluxos e persistência local; gerente integra e valida. O status só será aceito após testes de API, persistência e navegador.

Estado: **aceito**. Build integrado, 17 testes do servidor, 4 testes do motor e QA no navegador passaram. O modelo local processou pedidos editados/repetidos em novas conversas sem alterar as mensagens originais. Falha de fork preservou o texto; modal móvel e rolagem foram conferidos. Evidências: [ACEITE.md](ACEITE.md).

Em paralelo, Terra Ollama realiza uma prova isolada do motor nativo em `packages/runtime`, sem expor ferramentas no chat pessoal. A prova em fixture é evidência parcial de I03/F0 e não encerra a escolha do motor ou a integração com projetos.

Resultado da prova: leitura de dois arquivos, correção dos dois e execução de node:test 1/1 com qwen3.5-9b-coder. Relatório: [MOTOR.md](../tools/diagnostics/MOTOR.md). Próximo marco do motor: integração controlada com workspace e eventos; cancelamento/retomada reais e verificação do resultado antes de expor o modo de programação.

| Incremento | Foco | Condição de início |
| --- | --- | --- |
| I02 | Fechar lacunas de F1: múltiplos endpoints/perfis, organização, anexos, rascunhos e reconexão | Revisão de I01 |
| I03 | Prova do motor, instruções e acesso ao workspace | Serviço/modelo viável e contrato do runner |
| I04 | Editor, patch, diff, comandos e cancelamento de processos | I03 |
| I05 | Verificação end-to-end do MVP F2 | I04 |
| I06+ | F3–F8 em fatias por requisito e dependência | Aceite e revisão do marco anterior |

Cada incremento posterior terá tarefas concretas e caminhos atribuídos antes da codificação. Não antecipar edição concorrente sem contrato.

## Política de aceite

Acesso LAN antecipado por solicitação do proprietário em 27/10/2026: servidor permite bind nas interfaces locais e valida Host/origem. Instalação configurada em `0.0.0.0:3001`; regra de Firewall limitada à subrede local fornecida por script administrativo. OPS-05/F7 permanece parcial, com autenticação, pareamento e HTTPS pendentes. Evidência em ACEITE.md.

- Evidência contém ID, versão, ambiente, cenário, resultado e referência a teste/log/captura.
- Sem marcar fase concluída porque a interface mostra uma função futura.
- Sem deixar botão de recurso futuro com sucesso fictício.
- Credencial, serviço ou hardware ausente é pendência identificada.
- Mudança de escopo exige atualizar catálogo e roadmap.
- O gerente faz integração; agentes não instalam dependências simultaneamente nem sobrescrevem trabalho alheio.

## Estimativas

O planejamento completo mantém 90–145 dias úteis de esforço preliminar para uma pessoa. Três agentes permitem paralelizar partes, mas não permitem dividir esse prazo automaticamente por três: integração, dependências, contexto e GPU continuam limitantes. Atualizar estimativas após medir os primeiros incrementos.

### Revisão de I02 — recomendações orientativas

Aceito em 27/10/2026: parâmetros editáveis e avisos acima das recomendações, sem bloqueio por estimativa de hardware nem redução do contexto manual. Modo automático mantém indicação por capacidade total. Build, 30 testes do servidor, QA de navegador e preservação dos dados confirmados em ACEITE.md; ADR-011 substitui a imposição anterior de limites recomendados. Não encerra as demais pendências de I02.

### I02.6 — múltiplos servidores Ollama

Estado: aceito para CFG-02. Cadastro nomeado persistente, seleção no compositor por conversa, consulta de modelos/recomendações no endpoint escolhido e herança em ramificações. null/ausência segue o servidor global; chats legados foram preservados. Exclusão referenciada e troca durante geração retornam erro explícito. ADR-012 registra o contrato.

Build integrado, 32 testes do servidor, prova de transporte com dois servidores HTTP simulados e QA desktop/móvel em base separada passaram. Segundo host físico real não disponível. Instalação pessoal atualizada após backup e comparação idêntica dos dados; evidência em ACEITE.md. Próxima tarefa: CFG-04, perfis de modelo por conversa/projeto. F1 e o produto completo permanecem em andamento.

### I02.7 — perfis de modelo por conversa e projeto

Estado: aceito para CFG-04. CRUD de perfis persistentes, perfil de projeto/conversa, ajustes locais, restauração de herança e modelo do compositor sem alterar padrão global. Precedência e contrato registrados em ADR-013. Build, 35 testes do servidor, transporte e fluxos de UI simulados passaram. Instalação pessoal atualizada após término da geração ativa, backup e comparação idêntica de 8 conversas e 220 mensagens. Evidência em ACEITE.md; F0/F1 continuam em andamento.
