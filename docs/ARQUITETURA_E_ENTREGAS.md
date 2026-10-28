# Arquitetura, execução e entregas

Versão 2.0 · 27/10/2026 · Proposta de engenharia; validar versões no início da implementação.

Situação implementada em 28/10/2026 (I02.7): React/Vite em `apps/web`, Fastify e SQLite em `apps/server`, contratos em `packages/contracts`, adaptador Ollama em `packages/providers` e provas isoladas em `packages/runtime`. O chat usa streaming HTTP NDJSON; os dados de conversas, projetos, endpoints e perfis ficam no servidor. Runner separado, WebSocket, editor, terminal e os demais serviços descritos abaixo são arquitetura planejada. O estado verificável de cada entrega está em [ROADMAP.md](ROADMAP.md) e [ACEITE.md](ACEITE.md).

## 1. Organização da solução

```text
apps/web             Interface React, editor, terminal e painéis
apps/server          API, WebSocket, sessões e coordenação
apps/runner-windows  Processos, arquivos, desktop e terminais
packages/contracts   Schemas de dados, eventos e erros
packages/runtime     Interface do motor e adaptador escolhido
packages/providers   Ollama, voz, imagens, pesquisa e conectores
packages/ui          Tokens, componentes e cenários visuais
packages/storage     Migrações, repositórios e backup
tests/fixtures       Projetos, documentos e fluxos reproduzíveis
docs                 Escopo, design, operação e decisões
tools                Scripts de instalar, iniciar, parar e diagnosticar
```

O runner pode iniciar como módulo local do servidor e ser separado por transporte na fase remota. Não exigir microsserviços ou contêineres no MVP. Arquivos do usuário ficam em seus projetos; dados da aplicação em diretório escolhido, fora das fontes.

## 2. Serviços e responsabilidades

| Serviço/contrato | Responsabilidade |
| --- | --- |
| SessionService | Sessão do proprietário, origem, dispositivos pareados e revogação |
| ConversationService | Mensagens, rascunhos, ramificações e organização |
| RunCoordinator | Estado de tarefa, objetivo, fila, cancelamento e recuperação |
| AgentRuntime | Iniciar, retomar, direcionar, interromper e expor capacidades |
| ModelProvider | Catálogo, metadados, geração e parâmetros efetivos |
| ContextService | Seleção, referências, orçamento, compactação e memória |
| ToolRegistry | Schemas, executores, perfis e resultados estruturados |
| WorkspaceService | Arquivos, busca, patch, conflito e checkpoint |
| ProcessService | PTY, processos, árvores e saída incremental |
| GitService | Estado, bases, commits, branches e worktrees |
| PluginService | Skills, hooks, pacotes, catálogo e MCP |
| Scheduler | Horários, fuso, condições, disparos perdidos e histórico |
| ResourceScheduler | Concorrência, prioridade e carga de modelos/serviços |
| BrowserService | Sessão no host, DOM, entrada, captura e replay |
| DesktopService | Captura e entrada em janelas Windows |
| MediaService | STT/TTS, voz, imagens e tarefas de mídia |
| ArtifactService | Arquivo original, versões, previews e exportação |
| ConnectorService | Autenticação e operações dos sistemas externos |
| RemoteHostService | Pareamento, capacidades, conexão e transferência |
| OperationsService | Diagnóstico, backup, retenção e migrações |

Registrar decisões em `docs/DECISOES.md` durante implementação: motor, persistência, PTY, renderizador, transporte de browser, STT/TTS, imagens e distribuição. Não introduzir dependências sem necessidade de um requisito.

## 3. Seleção do motor

F0 compara dois caminhos com o mesmo projeto e tarefas. O adaptador Codex deve usar app-server por stdio internamente, com configuração isolada para este produto. Não alterar silenciosamente a configuração de outras instalações Codex do proprietário.

Teste obrigatório: inferência local; ler/buscar; alterar dois arquivos; executar teste; transmitir ações; interromper; retomar; respeitar acesso total. Confirmar ferramentas e formato de chamadas realmente suportados pelo modelo.

Se o adaptador não atender, selecionar motor nativo sobre API Ollama e registrar razão. Implementar primeiro apenas o motor escolhido; manter contrato sem obrigar o desenvolvimento de dois produtos paralelos. A aparência e os dados públicos da aplicação não podem depender de eventos privados de um único motor.

## 4. Entidades persistentes

| Grupo | Entidades |
| --- | --- |
| Organização | Project, SidebarSection, Conversation, ConversationBranch, Draft, ReadState |
| Execução | Run, RunEvent, ToolCall, Goal, CheckResult, ProcessSession, Checkpoint |
| Modelos | ProviderEndpoint, ModelCapability, ModelProfile, BenchmarkResult |
| Contexto | InstructionSource, MemoryEntry, ContextSummary, IndexedChunk |
| Git | RepositoryRef, WorktreeAttachment, ReviewComment, RemoteArtifact |
| Extensão | SkillPackage, PluginPackage, McpConnection, Hook, SecretRef |
| Automação | AgentDefinition, Subtask, Schedule, TriggerEvent, Notification |
| Navegação | BrowserProfile, BrowserSession, DesktopSession, RecordedFlow |
| Criação | Artifact, ArtifactVersion, PreviewJob, MediaJob, Publication |
| Operação | Host, EnvironmentProfile, DeviceSession, UiPreference, BackupManifest |

Segredos referenciados por identificador, guardados em mecanismo local apropriado. Banco armazena metadados e eventos; arquivos grandes ficam no disco com manifesto/hash. Migrações versionadas, integridade referencial e backup coerente entre banco e arquivos.

## 5. API e eventos

API própria versionada `/api/v1`, com schemas gerados/compartilhados. Recursos: sessions, projects, conversations, runs, files, terminals, git, models, tools, automations, artifacts, hosts, settings e diagnostics.

Eventos por WebSocket autenticado: conversation.updated, message.delta, run.state, tool.started, tool.output, tool.completed, file.changed, terminal.output, model.load, resource.queue, artifact.ready, notification e host.state.

Envelope mínimo:

```json
{
  "schemaVersion": 1,
  "eventId": "evt_example",
  "sequence": 42,
  "runId": "run_example",
  "hostId": "local",
  "type": "run.state",
  "occurredAt": "2026-10-27T15:00:00Z",
  "payload": { "state": "running" }
}
```

Retomada por sequência; cursor expirado retorna snapshot e indicação explícita. Um reconectar não reenfileira ferramenta. Eventos de saída têm paginação/limites de transporte configuráveis e acesso ao conteúdo completo no disco.

Separar stream de visualização do browser/desktop do canal de eventos: transporte próprio de frames/vídeo e entrada, com controle de pressão e qualidade. Playwright automatiza o browser; não fornece sozinho uma interface visual interativa remota.

## 6. Consistência e cancelamento

Estados: queued → loading/running → completed/failed/cancelled; paused e awaiting-input são persistentes. “Cancelling” informa que o pedido foi recebido e o executor ainda não confirmou parada.

Identificadores de operação e diário de efeitos ajudam a detectar repetição, mas não prometem execução exatamente uma vez em todos os sistemas externos. Após queda entre efeito e registro, reconciliar com o destino ou apresentar incerteza antes de repetir.

Não retomar um comando arbitrário interrompido do meio sem verificar seu estado. Separar retomada da conversa de reinício da ferramenta. Fechar aba mantém execução em segundo plano; desligar host encerra computação local e deixa estado recuperável.

Patches com versão/hash esperado. Checkpoints incluem arquivos relevantes e alterações anteriores; undo não equivale a reset geral do repositório. Conflitos ficam visíveis.

## 7. Recursos e hardware

Padrão inicial: uma geração ativa na RTX 4070. Agentes podem ser lógicos e executar em fila. STT, TTS, imagens e embeddings têm slots por serviço, prioridade e informação de espera.

Não prometer que tudo cabe simultaneamente. Medir VRAM/RAM, descarregar modelos quando necessário e oferecer contexto/modelo menores. Não alterar modelo ou usar nuvem silenciosamente por falta de memória.

Contexto = instruções + pedido + trechos + histórico selecionado + resultados + reserva de geração. Validar com a janela real; estimativas devem ser rotuladas. Busca semântica é melhoria posterior ao funcionamento da busca textual.

Benchmark separa: latência de carga, primeira resposta, geração, ferramentas e renderização. Fixar projeto/tarefa/modelo/quantização/contexto e registrar ambiente; comparar qualidade e velocidade separadamente.

## 8. Backends multimodais e documentos

| Modalidade | Decisão de implementação a validar | Evidência exigida |
| --- | --- | --- |
| STT | Motor local compatível com pt-BR | Microfone e arquivo transcritos com erros mensurados |
| TTS | Voz local licenciada e disponível | Fala inteligível, controle e interrupção |
| Voz contínua | VAD, STT, LLM e TTS com fila | Turnos completos, cancelamento e eco tratados |
| Imagens | Adaptador local como ComfyUI | Geração e edição reais com referências suportadas |
| PDF | Extração, geração e renderizador local | Texto e aparência conferidos em fixture |
| DOCX/PPTX | Bibliotecas e renderizador local | Arquivo editável e preview conferido |
| XLSX | Biblioteca e motor de cálculo local | Fórmulas de fixture recalculadas e conferidas |
| Vídeo/áudio | Players de formatos suportados | Reprodução e download de original |

Não presumir que Ollama gera imagens, sintetiza voz ou renderiza Office por si só. Serviços adicionais são parte da arquitetura incluída, com instalador/configuração e indicação de disponibilidade. Todos os formatos avançados ficam sujeitos aos limites de compatibilidade documentados.

## 9. Navegador, desktop e remoto

Browser gerenciado com perfil separado; preview local pode usar incorporação quando permitido. Para sites que bloqueiam iframe, usar o browser no host com transmissão de visualização e entrada. Browser existente exige extensão/pareamento implementado; nenhuma sessão pessoal será importada implicitamente.

Executor Windows opera com privilégios da conta ativa. Captura de tela, teclado e mouse exigem componente nativo e permissões do sistema. Histórico do computador é desativado inicialmente e controlável pelo proprietário; retenção/exclusão efetivas.

Host remoto tem identidade, capabilities e caminhos próprios. Transferir conversa não significa copiar todos os arquivos, processos e credenciais. Planejar manifesto de arquivos, reconciliação Git, segredos separados e relatório de incompatibilidades.

Execução em nuvem será um host do proprietário; não uma integração obrigatória com serviço gerenciado OpenAI. Usuário deve ver host e diretório no chat, terminal e confirmação de transferência.

## 10. Fases, saídas e evidências

| Fase | Saída verificável | Validação |
| --- | --- | --- |
| F0 | Diagnóstico e decisão do motor | Ciclo completo com modelo real e relatório |
| F1 | Shell, temas, chat, configuração | Fluxo novo usuário, streaming, persistência e estados de erro |
| F2 | Programação assistida utilizável | Corrigir bug conhecido, testar, inspecionar diff e cancelar processo |
| F3 | Ambiente de engenharia | Git/worktree, revisão, memória, modelos e recuperação demonstrados |
| F4 | Plataforma extensível | Skill, hook, MCP, plugin, subtarefa e agenda reais |
| F5 | Operação visual | Navegação, preview, replay e fluxo desktop acompanhados |
| F6 | Criação multimodal | Voz, geração/edição de imagem e documento de cada formato |
| F7 | Integração e mobilidade | Conectores reais, deploy, host remoto, API/CLI e PWA |
| F8 | Produto completo | Aceite integral, instalação limpa e restauração |

Esforço total no [planejamento principal](../PLANEJAMENTO.md): 90–145 dias úteis. Não confundir esforço com calendário quando houver dependência de conta, equipamento ou serviço. Fases de integração podem avançar em partes independentes, sem multiplicar a capacidade física da GPU.

Critérios universais de conclusão de fase: comportamento funcional, estados de falha, persistência necessária, visual, teclado, logs úteis, documentação e evidência real. Os itens da fase são identificados no catálogo; não encerrar por porcentagem subjetiva.

## 11. Qualidade e metas mensuráveis

Metas de engenharia, a medir após implementação; não são resultados já obtidos:

- Feedback visual de clique/digitação: alvo p95 inferior a 100 ms no host de referência.
- Ao receber um evento no navegador: atualização visual alvo inferior a 100 ms em carga normal.
- Cancelar: feedback imediato; pedido ao executor alvo inferior a 1 s; término efetivo medido e informado.
- Abrir histórico: lista paginada/virtualizada; testar base com 1.000 conversas sem carregar todas as mensagens.
- Saída de terminal: testar fluxo prolongado com limite de buffer e armazenamento em disco, sem congelar o chat.
- Reconexão: teste sem mensagem duplicada e sem repetição automática de ferramenta.
- Arquivos: testar Unicode, espaços, CRLF/LF, binários e projeto com mudanças anteriores.
- Interface: tamanhos/temas da especificação, zoom 200%, teclado e contraste.
- Qualidade do modelo: relatório por tarefa, sem confundir resposta plausível com teste aprovado.
- Inferência, voz e imagens: estabelecer latência aceitável por perfil após benchmark real; não fixar tokens/s sem medição.

## 12. Plano de testes e aceite

| Camada | Verificação necessária |
| --- | --- |
| Contratos | Schemas, migrações, sequência de eventos e estados |
| Integração | Ollama real, arquivos, PTY, Git, checkpoints e cancelamento |
| E2E | Pedido → alteração → teste → revisão → retomada |
| Recuperação | Queda de aba, servidor, Ollama e host; conflito entre efeito e registro |
| Extensibilidade | MCP stdio/HTTP, plugin incompatível e hook que falha |
| Automações | Fuso, duplicação, pausa, disparo perdido e notificações |
| Visual | T01–T26 e VIS-01–VIS-13 com estados aplicáveis |
| Modalidades | Serviço real de voz/imagens/documentos, incluindo indisponibilidade |
| Conectores | Provedor Git, comunicação, tarefas, arquivos/API, design e deploy configurados |
| Operação | Instalação limpa, offline, backup, restauração e migração com falha |

Testes de efeitos externos devem usar contas/projetos de teste autorizados. Não publicar dados de produção para provar que um botão funciona. Aprovações configuradas pelo proprietário se aplicam; o produto não adicionará bloqueios de conteúdo.

Evidência por requisito: ID, versão, ambiente/modelo, cenário, resultado, logs/captura e limitação. Manter `docs/ACEITE.md` na implementação, sem preencher como aprovado antes do teste. Credenciais ausentes produzem “aguardando configuração”; não “aceito”.

## 13. Operação, instalação e custo

Scripts PowerShell para diagnóstico, instalar dependências, iniciar/parar serviços, backup e restauração. Não presumir WSL/Docker; documentar opções posteriores e como alcançar Ollama do host.

Dependências de sistema: Node LTS, Ollama, Git, ferramentas de build nativo quando exigidas por PTY e renderizadores/backends escolhidos. Fixar versões testadas e registrar licenças. Fontes, ícones e bibliotecas do frontend disponíveis localmente para offline.

Dados da aplicação, caches, modelos, projetos e segredos separados. Backup com manifesto e verificação; snapshot coerente do SQLite e artefatos. Atualização faz backup e valida migração antes de concluir. Retenção configurável para logs, captura e mídia.

Custos locais: energia, armazenamento e tempo de GPU. Downloads e integrações externas podem ter termos e custos próprios. O fluxo principal não depende de assinatura ou chave OpenAI.

## 14. Primeira execução autorizável e concreta

Próximo trabalho de implementação: F0, com diagnóstico de RAM, serviço Ollama, modelos e motor. Não iniciar download de modelos grandes com tamanho desconhecido como consequência implícita do planejamento. Selecionar modelo existente quando possível e registrar o consumo.

A implementação foi autorizada posteriormente e começou com I01. Estado atual, equipe e evidências estão em [ROADMAP.md](ROADMAP.md), [EQUIPE_AGENTES.md](EQUIPE_AGENTES.md) e [ACEITE.md](ACEITE.md). A base de chat entregue não substitui a prova do motor de programação.
