# Decisões técnicas

## ADR-001 — Base de chat nativa com motor de programação pendente

Data: 27/10/2026. Estado: aceito para I01.

O primeiro chat usa o provider Ollama nativo para validar conexão, streaming, persistência e cancelamento. Isso não encerra a seleção de AgentRuntime nem a prova Codex app-server + ferramentas. A escolha do motor de programação permanece tarefa de F0/I03.

Consequência: base web avança independentemente da prova de ferramentas, sem anunciar um agente de programação já entregue.

## ADR-002 — SQLite nativo no Node 22

Data: 27/10/2026. Estado: aceito para desenvolvimento.

Usar node:sqlite evita compilação de dependência nativa no Windows. O runtime exige Node 22.13 ou superior; a API é experimental no Node instalado. Lockfile e testes de persistência acompanham a base; atualização do Node exige revalidação.

## ADR-003 — Loopback no primeiro incremento

Data: 27/10/2026. Estado: aceito para I01.

Servidor escuta apenas localhost/127.0.0.1. Validar host/origem e exigir JSON nas alterações. Acesso pela rede, pareamento e sessão autenticada completa são entregas posteriores; o produto não se apresenta como pronto para exposição pública.

## ADR-004 — Controle explícito de raciocínio

Data: 27/10/2026. Estado: aceito.

Preservar padrão do modelo com think=null e oferecer true/false como preferência. Encaminhar o parâmetro apenas quando definido. Não desativar raciocínio silenciosamente para obter resposta rápida; registrar o perfil usado em testes e reconhecer diferenças entre modelos.

## ADR-005 — Perfil automático condicionado ao hardware

Data: 27/10/2026. Estado: aceito para configuração de chat.

Atender ao pedido do proprietário de seguir as recomendações do modelo e a capacidade do computador. Consultar `/api/show`, `/api/tags` e `/api/ps`. Preservar temperatura, raciocínio e demais parâmetros do Modelfile por omissão de overrides no modo automático; contexto é uma exceção necessária à adequação de memória.

Combinar tamanho dos pesos com RAM/VRAM disponível e memória recuperável de modelos residentes, sem somar novamente a memória total. Estimar KV FP16 pelos metadados da arquitetura, inclusive vetores de heads por camada. Sem metadados suficientes, usar estimativa conservadora explicitamente identificada. Considerar margem para pesos, runtime e cache, e arredondar o teto de contexto para presets inferiores.

O contexto efetivo nunca excede o limite conhecido do modelo ou o teto estimado do hardware, inclusive em modo manual. Sem margem estimada para pesos/runtime/contexto mínimo, retornar erro antes da chamada de geração. Capacidade desconhecida não equivale a zero nem a uma garantia de execução. Para endpoint remoto, não atribuir os recursos locais à máquina remota.

O painel consulta o perfil do modelo selecionado e descarta respostas atrasadas de seleções anteriores. As estimativas variam com a carga; não são benchmark nem garantia de ausência de falta de memória. Não descarregar modelos de terceiros explicitamente para obter memória durante a avaliação.

## ADR-006 — Indicação pela capacidade total

Data: 27/10/2026. Estado: aceito; substitui a base de memória disponível da ADR-005 por solicitação explícita do proprietário.

Usar 85% da capacidade total de RAM e da GPU selecionada como orçamento estimado. Preservar as reservas de pesos, runtime e cache KV e o limite do modelo. Selecionar a GPU por maior memória total, sem somar a VRAM de dispositivos distintos. Memória livre e modelos residentes não alteram a indicação nem são somados ao orçamento.

Exibir memória livre separadamente como informação. A mesma máquina e modelo devem produzir a mesma indicação quando variar apenas a ocupação de memória. A avaliação de capacidade total não comprova disponibilidade imediata para carregar o modelo sob qualquer carga. O modo de execução e os motivos exibidos devem mencionar essa base total.

## ADR-007 — Acesso pela rede local

Data: 27/10/2026. Estado: aceito por solicitação explícita do proprietário; substitui a exigência de loopback da ADR-003 para esta instalação.

Permitir `HOST=0.0.0.0` ou endereço privado pertencente à máquina. Esta instalação usa porta 3001. Validar Host contra os nomes e endereços locais reais e exigir a mesma origem nas requisições do navegador, preservando a exceção de desenvolvimento em loopback:5173. Ollama continua acessível pelo servidor em loopback, sem abrir a porta 11434 na rede.

O script `tools/enable-lan-firewall.ps1` cria uma regra administrativa idempotente restrita ao executável Node, TCP 3001, perfis privado/domínio e subrede local. O acesso atual pressupõe uma rede confiável: pareamento, autenticação e HTTPS continuam no escopo pendente de F7. Nenhuma publicação ou configuração de roteador está incluída.

## ADR-008 — Seções persistentes de conversas

Data: 27/10/2026. Estado: aceito para a fatia de seções em I02.3.

Seções são agrupamentos nomeados no SQLite, com posição ordenada. Cada conversa tem zero ou uma seção; conversas legadas permanecem em Sem seção. Reordenar atualiza as posições em uma transação. Remover seção devolve as conversas a Sem seção e mantém todas as mensagens. Ramificações herdam a seção de origem. A ordem recente/título e os favoritos continuam aplicáveis dentro dos grupos.

Esta estrutura organiza o histórico; não representa um projeto vinculado ao sistema de arquivos. O contrato de projetos e de ferramentas será definido em I03 sem atribuir acesso a pastas a uma simples seção.

## ADR-009 — Referências visuais e atividades reais

Data: 27/10/2026. Estado: aceito para a fatia visual e de atividades em I02.4.

Adotar as capturas de tela fornecidas pelo proprietário como referência do shell e das mensagens. Os agrupamentos existentes passam a ser apresentados como projetos, com pasta e repositório opcionais cadastrados pelo proprietário. Esses campos são metadados persistentes: não concedem acesso ao sistema de arquivos nem executam comandos.

Persistir e transmitir atividades de consulta do modelo, avaliação de memória e geração, com identificadores, estado e horários. O navegador deriva a duração desses horários; cancelamento, erro e reinício encerram estados em execução. Ramificações preservam o registro das mensagens copiadas. O painel não revela raciocínio interno e não inventa ferramentas, alterações de arquivos ou subagentes. Ferramentas do motor continuam dependendo de I03/I04.

## ADR-010 — Anexos locais persistidos e contexto estimado

Data: 27/10/2026. Estado: aceito para I02.5.

Persistir texto/código UTF-8 e PNG/JPEG/WebP junto à mensagem no SQLite, sem tratar nomes de arquivos como caminhos nem executar conteúdo. A entrada JSON tem limites de quantidade, tamanho e dimensões, e o servidor produz IDs e tamanhos canônicos. Imagens são preparadas no navegador e revalidadas no servidor. Ramificações preservam os dados com novas identidades de anexo.

Enviar texto delimitado e imagens base64 ao Ollama, preservando a mensagem e a ordem do histórico. Exigir visão confirmada para imagens. Estimar entrada usando bytes UTF-8, overhead de mensagens e pixels, com reserva para a resposta; a heurística não equivale a um tokenizer nem garante ausência de falta de memória. Usar sempre o contexto efetivo condicionado ao modelo e à capacidade total do hardware. Não truncar anexos silenciosamente.

Quando o anexo for rejeitado antes da geração, preservar o pedido e o erro no histórico, mas excluí-lo do contexto de inferência dos próximos pedidos. Assim é possível remover ou substituir o arquivo. Turnos concluídos continuam fornecendo seus anexos ao histórico do modelo. Cancelamentos e falhas após início da geração mantêm a regra anterior.

Anexos não enviados são rascunhos em memória por conversa nesta aba e se perdem ao recarregar; o texto continua no armazenamento local. Anexos enviados são persistentes. Processamento de PDF/Office/compactados e rascunhos persistentes de arquivos ficam para incrementos posteriores.

## ADR-011 — Recomendações orientativas e parâmetros manuais

Data: 27/10/2026. Estado: aceito. Solicitação explícita do proprietário.

As indicações de hardware e modelo orientam e advertem; não impedem a alteração dos parâmetros. Esta decisão substitui o bloqueio e a redução silenciosa do modo manual das ADR-005/006 e esclarece o contexto efetivo da ADR-010. A base da indicação continua sendo a capacidade TOTAL de RAM/VRAM, o tamanho dos pesos e a estimativa de cache KV, preservando reservas no modo automático.

Editar temperatura, contexto ou raciocínio desativa o acompanhamento automático e copia os outros valores visíveis para o perfil manual. Presets permanecem disponíveis, com contexto personalizado entre 128 e 1048576 tokens. Valores acima da recomendação, da estimativa de memória ou do limite informado pelo modelo exibem avisos sem impedir salvamento. Contexto manual é enviado integralmente ao provider, inclusive sem metadados de hardware. Capacidade estimada insuficiente gera aviso na atividade, sem impedir a tentativa. Falhas reais do Ollama permanecem erros explícitos. Validação de payload, suporte a imagens e orçamento dos anexos contra o contexto efetivamente configurado permanecem vigentes.

## ADR-012 — Endpoints Ollama por conversa

Data: 27/10/2026. Estado: aceito para I02.6 / CFG-02.

Cadastrar endpoints nomeados no SQLite e guardar endpointId opcional na conversa. Ausência/null representa a URL global de settings, sem criar cadastros fictícios nem vincular retroativamente conversas legadas. Escolha explícita persiste ao reabrir e ramificar; voltar ao padrão remove o vínculo. O cadastro pode editar nome/URL, mas não pode ser excluído enquanto alguma conversa o referenciar. Endpoints não contêm credenciais e seguem a validação HTTP(S) do provider.

Catálogos e recomendações aceitam endpointId e não recorrem ao padrão quando o ID é inválido. A geração captura a URL resolvida antes do stream e usa a mesma conexão para metadados e chat. Trocar o vínculo da conversa ou editar o endpoint em uso é rejeitado durante a geração; cancelamento e continuidade mantêm o endpoint. Modelos, conexão e visão na interface acompanham o servidor selecionado, com cancelamento de consultas obsoletas. O painel de configurações mantém parâmetros e catálogo globais; perfis por conversa/projeto (CFG-04) continuam pendentes.

A prova com dois servidores HTTP simulados comprova roteamento e isolamento do transporte, sem representar dois hosts físicos reais. O servidor Ollama local forneceu catálogo real ao QA visual; a disponibilidade de um segundo host real permanece não validada.

## ADR-013 — Perfis e ajustes locais de geração

Data: 28/10/2026. Estado: aceito para I02.7 / CFG-04.

Persistir perfis nomeados com modelo, instruções, acompanhamento automático, temperatura, numCtx e think. Projetos e conversas admitem profileId opcional; conversas também admitem configOverrides parcial. A resolução usa configurações gerais, substitui os campos de geração pelo perfil do projeto, depois pelo perfil explícito da conversa, e finalmente aplica os ajustes locais. null remove vínculo/ajustes; objeto vazio de ajustes normaliza para herança. Perfis não contêm tema nem endpoint. O endpoint da conversa continua independente.

GET /configuration fornece configurações resolvidas, origem, perfil e presença de ajustes para alinhar interface e geração. O servidor captura a resolução antes do stream. Ramificações preservam vínculo de perfil e ajustes; legados não recebem backfill. Perfis referenciados não são excluídos. Alterar perfil/projeto/vínculo/ajustes usados por geração ativa retorna 409. PATCH think:null limpa o valor anterior. Recomendações permanecem orientativas; contexto manual é enviado integralmente ao provider.

O compositor usa o modelo resolvido; selecionar outro modelo grava um ajuste local, sem modificar configurações gerais ou perfil compartilhado. Novas conversas mantêm perfil/ajustes escolhidos no rascunho até o POST. A interface bloqueia envio durante resolução e cancela consultas obsoletas; troca de projeto/perfil/ajustes invalida a configuração. O editor informa que alterações de perfil compartilhado afetam seus chats. Restaurar herança limpa ajustes locais, mantendo o vínculo de perfil explícito, quando houver.

Build, 35 testes e provas com provider/HTTP Ollama simulados passaram. Transporte testou precedência e parâmetros efetivos, incluindo contexto acima dos metadados, fork e cancelamento/continuidade. UI exercitou CRUD, projeto/conversa, erros de gravação, herança, persistência, geração simulada, teclado/foco e modal móvel. Aplicado à instalação pessoal após término da geração ativa, backup atualizado e comparação idêntica dos dados; não se afirma inferência real nova para este incremento.
