# Escopo funcional completo

Versão 2.0 · 27/10/2026 · Catálogo fechado para este planejamento.

## Como ler

Todos os itens abaixo integram a versão completa. A fase indica quando serão implementados, não se são opcionais. Recursos com dependência externa permanecem no escopo mesmo que o proprietário prefira mantê-los desativados.

Estado inicial: **planejado**. Estados futuros: em implementação, em validação, aceito, falhou, aguardando configuração. Uma tela ou botão sem implementação não conta como entrega.

Dependências: **B** = base local/servidor/disco; **O** = Ollama e modelo compatível; **G** = Git; **W** = executor Windows; **N** = internet; **C** = credencial/serviço externo; **V** = serviço local de voz; **I** = serviço local de imagens; **D** = ferramentas locais de documentos; **R** = outro host configurado. Combinações indicam dependências acumuladas.

Estes são requisitos da aplicação proposta, não uma afirmação de que todos os recursos existem em cada edição do Codex.

## 1. Configuração e modelos

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| CFG-01 | Primeiro uso e diagnóstico | F1 | B/O | Detectar conexão, oferecer endereço manual e concluir configuração sem conta de nuvem |
| CFG-02 | Múltiplos servidores Ollama | F1 | O | Cadastrar dois endpoints e indicar qual é usado por cada conversa |
| CFG-03 | Lista e capacidades | F1 | O | Mostrar modelos reais e suporte informado a ferramentas, visão, contexto e raciocínio |
| CFG-04 | Perfis de modelo | F1 | O | Salvar parâmetros e selecionar perfil por conversa/projeto |
| CFG-05 | Parâmetros suportados | F1 | O | Editar contexto, geração, amostragem e permanência; indicar parâmetros não aceitos |
| CFG-06 | Prompt e precedência | F1 | B/O | Inspecionar camadas de instrução e alterar configurações do proprietário |
| CFG-07 | Download e remoção | F3 | O/N | Mostrar progresso/falha; cancelar download e remover modelo selecionado |
| CFG-08 | Importação local | F3 | O | Importar formato suportado pelo Ollama e testar modelo registrado |
| CFG-09 | Modelfile e variantes | F3 | O | Editar configuração, criar variante e usá-la em conversa |
| CFG-10 | Carga e descarregamento | F3 | O | Mostrar modelos ativos e liberar o modelo solicitado |
| CFG-11 | Benchmark e papéis | F4 | O | Comparar tarefas fixas e associar modelos a código, revisão, visão e embeddings |
| CFG-12 | Backup de perfis | F3 | B | Exportar/importar configurações sem embutir credenciais por padrão |

## 2. Conversas e compositor

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| CHAT-01 | Conversa e streaming | F1 | B/O | Exibir resposta incremental e persistir mensagem final |
| CHAT-02 | Parar, repetir e editar pedido | F1 | B/O | Parar geração; repetir ou ramificar a partir de pedido editado |
| CHAT-03 | Organização | F1 | B | Renomear, favoritar, arquivar, restaurar e ordenar conversas |
| CHAT-04 | Seções e projetos | F1 | B | Criar seção, mover itens e preservar ordem após recarregar |
| CHAT-05 | Busca | F3 | B | Buscar mensagem globalmente ou na conversa e abrir ocorrência |
| CHAT-06 | Anexos e colagem | F1 | B | Anexar arquivos, colar imagem e mostrar processamento/erro por item |
| CHAT-07 | Menções | F2 | B | Referenciar arquivo, pasta, trecho ou conversa e abrir alvo correto |
| CHAT-08 | Conteúdo formatado | F1 | B | Renderizar Markdown, tabelas e código; copiar e abrir como artefato |
| CHAT-09 | Fila de prompts | F3 | B/O | Adicionar, editar, reordenar e remover pedidos durante execução |
| CHAT-10 | Direcionamento em execução | F3 | B/O | Enviar correção ao trabalho atual preservando objetivo e rascunho |
| CHAT-11 | Conversa lateral | F3 | B/O | Perguntar sobre texto selecionado sem interromper tarefa principal |
| CHAT-12 | Ramos e transferência | F3 | B | Criar ramo preservando contexto e mover conversa entre projetos |
| CHAT-13 | Rascunho e leitura | F1 | B | Recuperar rascunho e posição de leitura ao voltar à conversa |
| CHAT-14 | Exportar e compartilhar | F7 | B | Exportar Markdown/JSON, importar formato próprio e compartilhar snapshot revogável |
| CHAT-15 | Notificações e não lidas | F3 | B | Marcar estado e notificar conclusão conforme preferência |
| CHAT-16 | Comandos e sugestões | F4 | B/O | Descobrir comandos `/`; aceitar/dispensar predição opcional no compositor |

## 3. Projetos, arquivos e editor

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| IDE-01 | Abrir/criar projeto | F2 | B/W | Escolher diretório no host e reabrir pelo histórico |
| IDE-02 | Árvore e operações | F2 | B/W | Criar, renomear, mover e excluir alvo selecionado; mostrar erros |
| IDE-03 | Busca de arquivos/texto | F2 | B/W | Filtrar ocorrências e abrir arquivo na linha correspondente |
| IDE-04 | Editor com abas | F2 | B | Editar/salvar, desfazer/refazer e indicar arquivo modificado |
| IDE-05 | Codificação e linhas | F2 | B | Preservar UTF-8 e CRLF/LF; suportar Unicode e reconhecer binário |
| IDE-06 | Concorrência de edição | F3 | B/W | Detectar edição externa e resolver sem sobrescrita silenciosa |
| IDE-07 | Diff | F2 | B | Comparar unificado/lado a lado e abrir fonte com contexto |
| IDE-08 | Patches | F2 | B/W | Aplicar mudança e retornar conflito quando a base divergir |
| IDE-09 | Checkpoints | F3 | B/W | Restaurar trabalho do agente preservando alteração anterior do proprietário |
| IDE-10 | Layout persistente | F1 | B | Redimensionar/recolher painéis e restaurar preferências |
| IDE-11 | Previews | F2 | B | Abrir Markdown/imagem/mídia; oferecer download de formatos não renderizados |
| IDE-12 | Diagnósticos | F3 | B/W | Ligar erros de ferramentas a arquivo/linha e abrir ocorrência |
| IDE-13 | Editor externo | F7 | W | Abrir arquivo e linha em editor instalado escolhido |
| IDE-14 | Instruções do projeto | F2 | B | Ver/editar instruções e arquivos AGENTS.md considerados pelo motor |

## 4. Terminal, processos e verificações

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| EXE-01 | Terminal PowerShell | F2 | W | Digitar, redimensionar, interromper e receber saída em tempo real |
| EXE-02 | Múltiplos terminais | F2 | W | Abrir sessões por projeto com diretório e nome próprios |
| EXE-03 | Comandos do agente | F2 | W | Mostrar comando, cwd, host, saída, duração e código de saída |
| EXE-04 | Processos em segundo plano | F3 | W | Manter processo ao trocar de conversa e permitir encerramento |
| EXE-05 | Parar árvore de processos | F2 | W | Encerrar filhos associados e informar processos remanescentes |
| EXE-06 | Ações de ambiente | F3 | W | Cadastrar setup, dev, test, build e lint reutilizáveis |
| EXE-07 | Resultados de verificações | F3 | W | Distinguir passou, falhou, ignorado e não executado, com evidências |
| EXE-08 | Logs e segredos | F3 | B/W | Buscar/exportar logs e mascarar credenciais conhecidas |

## 5. Agente, contexto e autonomia

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| AGT-01 | Modo chat | F1 | O | Responder sem executar ferramentas de escrita ou comandos |
| AGT-02 | Modo planejamento | F2 | O | Produzir plano verificável e permitir iniciar sua execução |
| AGT-03 | Modo execução | F2 | O/W | Ler, editar, verificar e apresentar resultado com artefatos |
| AGT-04 | Modo revisão | F3 | O/G | Examinar diff e apontar problemas em linhas válidas |
| AGT-05 | Perfis de autonomia | F2 | B/W | Aplicar leitura, edição ou acesso total com indicador persistente |
| AGT-06 | Acesso total | F2 | O/W | Completar tarefa com ferramentas habilitadas sem confirmação por comando |
| AGT-07 | Inspecionar ferramentas | F2 | B | Exibir nome, argumentos, resultado e estado de cada chamada |
| AGT-08 | Ciclo de ferramentas | F2 | O/W | Validar chamada, executar e devolver resultado sem executar texto livre |
| AGT-09 | Objetivos persistentes | F4 | B/O | Manter objetivo, evidência de conclusão e pausar/retomar |
| AGT-10 | Falhas e repetição | F3 | B/O | Evitar loop de erro idêntico e não repetir efeitos já confirmados |
| AGT-11 | Orçamento de contexto | F2 | O | Mostrar estimativa, reservar saída e evitar excesso silencioso |
| AGT-12 | Compactação | F3 | O | Retomar com resumo persistente e acesso a fontes originais |
| AGT-13 | Memória editável | F3 | B | Consultar, corrigir e excluir memória global e de projeto |
| AGT-14 | Busca semântica | F4 | O/B | Indexar/recuperar trechos sem enviar repositório a serviço remoto |
| AGT-15 | Recuperação | F3 | B/W | Reconciliar execução interrompida antes de retomar |
| AGT-16 | Progresso e métricas | F2 | O | Mostrar modelo, uso de ferramentas e métricas realmente disponíveis |

## 6. Git, worktrees e revisão

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| GIT-01 | Estado e diff Git | F3 | G | Mostrar staged, unstaged e untracked com bases explícitas |
| GIT-02 | Stage e commits | F3 | G | Selecionar arquivos/trechos e criar commit com mensagem editável |
| GIT-03 | Branches e histórico | F3 | G | Criar/trocar branch e abrir commit/diff |
| GIT-04 | Worktree por tarefa | F3 | G | Criar, associar e reabrir checkout isolado |
| GIT-05 | Arquivar/recuperar worktree | F3 | G | Preservar trabalho recuperável e informar arquivos não incluídos |
| GIT-06 | Transferir alterações | F3 | G | Aplicar trabalho em checkout de destino e apresentar conflitos |
| GIT-07 | Resolver conflitos | F3 | G | Identificar trechos, editar resolução e verificar estado final |
| GIT-08 | Bases de revisão | F3 | G | Comparar branch, commit, staged, unstaged ou último trabalho |
| GIT-09 | Comentários por linha | F3 | B/G | Anexar ao lado/linha corretos e enviar ao agente |
| GIT-10 | Remotos | F7 | G/N/C | Executar fetch/pull/push e mostrar rejeição/autenticação |
| GIT-11 | Issues e PR/MR | F7 | G/N/C | Ler, criar/atualizar e vincular PR/MR real |
| GIT-12 | CI e revisão remota | F7 | N/C | Consultar checks/logs e acompanhar revisão configurada |

## 7. Skills, ferramentas e plugins

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| EXT-01 | Skills locais | F4 | B | Descobrir SKILL.md e recursos; indicar utilização |
| EXT-02 | Gestão de skills | F4 | B | Criar, editar, importar/exportar e habilitar por escopo |
| EXT-03 | Ferramentas próprias | F4 | B/W | Registrar schema/executor e testar argumentos/resultados |
| EXT-04 | MCP stdio | F4 | W | Iniciar servidor local e usar ferramenta/recurso disponível |
| EXT-05 | MCP HTTP | F4 | N/C | Autenticar/reconectar e distinguir falha de autorização |
| EXT-06 | Pacotes de plugin | F4 | B | Instalar versão, inspecionar conteúdo e desabilitar/remover |
| EXT-07 | Catálogo | F4 | B/N | Adicionar fonte e informar compatibilidade por versão |
| EXT-08 | Hooks | F4 | W | Disparar hook antes/depois da execução e registrar resultado |
| EXT-09 | Conexões e credenciais | F4 | B/C | Testar integração e guardar segredo fora do chat |
| EXT-10 | Comunicação e tarefas | F7 | N/C | Exercitar um conector de comunicação e um de tarefas |
| EXT-11 | Arquivos e APIs | F7 | N/C | Consultar fonte/API conectada e citar origem |
| EXT-12 | Compatibilidade | F4 | B | Informar formato aceito e erro de dependência; validar pacotes antes de anunciar suporte |

## 8. Agentes e automações

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| AUT-01 | Agentes personalizados | F4 | O | Configurar modelo, prompt, ferramentas e papel |
| AUT-02 | Delegação | F4 | B/O | Criar subtarefa, observar estado e integrar resultado |
| AUT-03 | Fila de recursos | F4 | B/O | Serializar inferência quando necessário para caber na VRAM |
| AUT-04 | Edição entre agentes | F4 | G/B | Evitar sobrescrita silenciosa por tarefas concorrentes |
| AUT-05 | Agendas | F4 | B | Salvar horário/fuso e disparar; testar America/Sao_Paulo |
| AUT-06 | Monitoramento | F4 | B/O | Reavaliar condição e notificar mudança significativa |
| AUT-07 | Ações e templates | F4 | B | Executar fluxo salvo com parâmetros diferentes |
| AUT-08 | Controles e avisos | F4 | B | Pausar, retomar, cancelar, silenciar e selecionar canal |
| AUT-09 | Disparos perdidos | F4 | B | Reconciliar indisponibilidade sem duplicar execução |
| AUT-10 | API/webhook/eventos | F7 | B/N/C | Disparar tarefa por fonte autenticada configurada |

## 9. Navegador e computador

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| WEB-01 | Pesquisa substituível | F5 | N | Buscar e abrir fontes sem fallback oculto |
| WEB-02 | Leitura e citações | F5 | N | Extrair página e ligar afirmações às fontes usadas |
| WEB-03 | Navegação automatizada | F5 | W/N | Navegar, preencher e clicar verificando DOM/screenshot |
| WEB-04 | Browser no painel | F5 | W | Exibir sessão realmente operada no host e aceitar entrada |
| WEB-05 | Perfis e login | F5 | W | Criar perfil separado e preservar sessão conforme preferência |
| WEB-06 | Browser existente | F5 | W | Parear extensão com navegador suportado e operar aba selecionada |
| WEB-07 | Preview local | F5 | W | Iniciar aplicação, detectar URL e mostrar preview/recarregamento |
| WEB-08 | Comentário visual | F5 | B | Anotar região e enviar imagem/localização ao agente |
| WEB-09 | Captura de evidência | F5 | W | Capturar screenshot/vídeo e reproduzir no histórico |
| WEB-10 | Record/replay | F5 | W | Reexecutar fluxo parametrizado e parar ao faltar alvo |
| PC-01 | Executor Windows | F5 | W | Capturar janela e enviar teclado/mouse ao alvo correto |
| PC-02 | Acompanhamento | F5 | W | Mostrar host/janela e interromper controle imediatamente |
| PC-03 | Aplicativos desktop | F5 | W | Concluir fluxo real e informar limites de app não suportado |
| PC-04 | Histórico do computador | F5 | W/B | Registrar quando ativado; consultar, pausar, expirar e excluir |

## 10. Voz, visão e imagens

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| MED-01 | Visão no chat | F6 | O | Analisar imagem com modelo compatível e informar incompatibilidade |
| MED-02 | Ditado pt-BR | F6 | V | Transcrever microfone localmente e editar antes de enviar |
| MED-03 | Transcrição de arquivo | F6 | V | Transcrever áudio real com progresso e referência ao original |
| MED-04 | Resposta falada | F6 | V | Sintetizar fala local com play, pausa e voz configurável |
| MED-05 | Conversa por voz | F6 | V/O | Alternar ouvir/processar/falar e aceitar interrupção do usuário |
| MED-06 | Dispositivos | F6 | B/V | Selecionar dispositivos suportados e explicar permissão negada |
| MED-07 | Geração de imagens | F6 | I | Gerar imagem local e salvar prompt/parâmetros |
| MED-08 | Edição de imagens | F6 | I | Usar referência/máscara suportadas e mostrar versão resultante |
| MED-09 | Variantes | F6 | B/I | Comparar, baixar original e repetir com parâmetros disponíveis |
| MED-10 | Fila multimodal | F6 | B/O/V/I | Mostrar dependências, alternar cargas e cancelar sem travar chat |

## 11. Artefatos e publicação

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| ART-01 | Biblioteca | F3 | B | Relacionar arquivo à execução, pesquisar, versionar e baixar |
| ART-02 | HTML/aplicações | F5 | W | Renderizar preview isolado e abrir fonte associado |
| ART-03 | PDF | F6 | D | Extrair, gerar e exibir páginas renderizadas |
| ART-04 | DOCX | F6 | D | Criar/editar e validar aparência por renderização |
| ART-05 | XLSX/CSV | F6 | D | Criar/editar fórmulas suportadas e verificar recálculo |
| ART-06 | PPTX | F6 | D | Criar/editar e exibir preview das páginas |
| ART-07 | Diagramas/gráficos | F6 | D/B | Produzir SVG/PNG ou Mermaid e exportar fonte/imagem |
| ART-08 | Áudio/vídeo | F6 | B | Reproduzir formatos suportados e oferecer arquivo original |
| ART-09 | Pacote-fonte | F7 | B | Exportar projeto/instruções excluindo segredos configurados |
| ART-10 | Publicação | F7 | W/N/C | Publicar em destino escolhido e mostrar versão/URL |
| ART-11 | Versões publicadas | F7 | N/C | Listar versão e executar rollback suportado pelo destino |
| ART-12 | Ferramenta de design | F7 | N/C | Conectar via plugin/MCP e importar/exportar artefato compatível |

## 12. Acesso, operação e visual

| ID | Requisito | Fase | Dep. | Aceite observável |
| --- | --- | --- | --- | --- |
| OPS-01 | Sistema visual | F1 | B | Implementar tokens/componentes nos temas claro, escuro e sistema |
| OPS-02 | Responsividade/teclado | F1 | B | Operar em desktop/tablet/celular com foco visível |
| OPS-03 | Região e idioma | F1 | B | Padrão pt-BR/America/Sao_Paulo e preferências persistentes |
| OPS-04 | Sessão e origem | F1 | B | Impedir comando de origem externa sem sessão válida |
| OPS-05 | Rede | F7 | B/N | Acessar de outro dispositivo com autenticação/conexão protegida |
| OPS-06 | PWA | F7 | B | Instalar onde suportado e indicar servidor indisponível |
| OPS-07 | Hosts/SSH | F7 | R | Parear host e executar tarefa com caminhos do destino |
| OPS-08 | Transferir tarefa | F7 | R/G | Transferir estado/arquivos selecionados e apresentar conflitos |
| OPS-09 | Ambientes reproduzíveis | F7 | W/R | Salvar setup/variáveis/ações e recriar ambiente de teste |
| OPS-10 | API/CLI/editor | F7 | B/W | Enviar tarefa por API/CLI e abrir arquivo/conversa por ligação documentada |
| OPS-11 | Backup/restauração | F8 | B | Restaurar instalação de teste e verificar histórico/artefatos |
| OPS-12 | Atualização/migração | F8 | B | Atualizar com backup e recuperar após falha simulada |
| OPS-13 | Diagnóstico | F3 | B/O/W | Exibir versões, conexões, filas e recursos observados |
| OPS-14 | Offline | F8 | B/O | Executar fluxo principal sem rede ou fallback de nuvem |
| OPS-15 | Retenção e remoção | F8 | B | Expirar/excluir memória, conversa, mídia e histórico associado |
| OPS-16 | Instalação/manual | F8 | W | Instalar em ambiente limpo e iniciar/parar com scripts |

## 13. Dependências e equivalentes locais

| Capacidade | Implementação prevista |
| --- | --- |
| Execução em nuvem | Executor em máquina/servidor do proprietário, inclusive remoto |
| Voz | Adaptadores STT/TTS locais escolhidos após benchmark |
| Imagens | Backend local, como ComfyUI, conforme GPU e compatibilidade |
| Browser compartilhado | Browser no host com transporte de visualização/entrada, sem depender de iframe universal |
| Aplicativos | Agente Windows separado; o navegador sozinho não controla janelas |
| Office | Bibliotecas e renderizador local; suporte a add-ins proprietários não presumido |
| Sites | Preview e adaptadores de publicação em destino escolhido |
| Auditoria de código | Revisão e análise local; sem afirmar equivalência a serviço comercial especializado |

## 14. Limites do produto pessoal

Aplicações nativas completas para iOS/Android, extensão completa de IDE, loja comercial, cobrança, SSO empresarial, SCIM, EKM e administração de organização multiusuário não fazem parte deste produto pessoal. O acesso móvel será responsivo/PWA; integração de editor será por API/CLI e abertura de arquivos.

Modelos privados, créditos e infraestrutura gerenciada da OpenAI não são entregáveis locais. Recursos novos do Codex exigem revisão do catálogo. O equivalente incluído precisa funcionar; renomear uma tela não satisfaz o requisito.
