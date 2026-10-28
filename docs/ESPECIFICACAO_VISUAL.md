# Especificação visual e de interação

Versão 3.0 · 27/10/2026 · Todos os requisitos VIS deste documento integram a entrega completa.

## 1. Direção de aparência — VIS-01

Referência atual: quatro capturas de tela fornecidas pelo proprietário em 27/10/2026. O pedido explícito de reproduzir essas telas substitui as medidas, cores e restrições de identidade anteriores nos componentes correspondentes. Implementação: barra de ícones 52 px, navegação 276 px, cabeçalho 46 px, coluna 736 px, compositor 98 px com raio 22 px, painel de contexto 300 px. Em 1738×1332, coluna/compositor começam em x=515; compositor em y=1224. Fundo escuro #181818, navegação #1b1d1c, barra #202322, compositor #343434, balão do usuário azul #19447c. Texto 13 px e entrelinha 23 px nas mensagens.

Projetos usam pastas, conversas indentadas, seleção neutra e menus flutuantes com contagem e metadados reais. O compositor exibe o modelo Ollama selecionado, modo de configuração real e botão circular de enviar/parar. Atividades são etapas reais do servidor, com duração e expansão/recolhimento. Cartões de alterações, subagentes, voz e serviços de fontes só serão exibidos quando houver dados e ações implementados para eles; as capturas não são fonte de resultados de execução.

Revisão de interação solicitada pelo proprietário: projetos iniciam recolhidos a cada carregamento. Clicar no nome alterna a lista de conversas entre aberta e fechada; `aria-expanded` e o ícone da pasta acompanham. Clicar no nome também fecha menus de opções abertos. O menu de reticências mantém abertura/fechamento pelo mesmo botão, Escape e clique fora.

O tema claro e o layout móvel continuam funcionais. As composições e medidas abaixo permanecem referências históricas ou metas para os painéis ainda não implementados; a revisão acima prevalece no shell, nas mensagens, nos projetos e no compositor.

Revisão de mensagens em 27/10/2026: pedidos em balões neutros compactos alinhados à direita (até 85% da coluna, 92% no celular); respostas abertas à esquerda, sem balão. Rótulos repetidos de papel/modelo não aparecem visualmente; artigos preservam identificação acessível. Ícones de ação ficam fora do balão e mantêm hover, foco e toque. Essa revisão orienta a implementação atual, sem alterar os dados históricos das referências SVG.

Ambiente de trabalho discreto, com superfícies neutras, foco no conteúdo e pouca decoração. Estrutura inspirada no Codex: navegação persistente, conversa central, ferramentas em painel lateral e terminal inferior. Usar identidade própria e indicar Ollama e host reais.

Referências autorais: [desktop escuro](design/desktop-escuro.svg), [desktop claro](design/desktop-claro.svg) e [celular](design/mobile.svg). São composições estáticas; dados de modelo, comandos, métricas e resultados nelas são ilustrativos.

Não se declara reprodução pixel a pixel de tela não fornecida. O alvo verificável desta versão são os valores e composições aqui definidos. Logotipo e identidade proprietários não serão copiados.

## 2. Estrutura da área de trabalho — VIS-02

Revisão de Markdown em 27/10/2026: o compositor mantém altura mínima de referência, mas cresce conforme texto digitado/colado. O campo parte de 40 px e cresce até o menor valor entre 320 px e 35% da altura da janela; depois rola internamente. O compositor, incluindo anexos e rodapé, é limitado a 65% da janela, com filhos roláveis e envio acessível. Um botão de olho alterna edição do texto bruto e prévia Markdown GFM. Mensagens do usuário também renderizam Markdown, preservando a fonte para edição/cópia; HTML não é executado.

| Região | Desktop | Comportamento |
| --- | --- | --- |
| Barra superior | 52 px de altura | Projeto, título, host, branch, busca/paleta e ações |
| Navegação esquerda | 248 px; ajustável de 208 a 360 px | Nova conversa, busca, seções, projetos e conversas |
| Conversa | Mínimo 400 px em modo dividido | Conteúdo com largura de leitura máxima de 760 px |
| Painel direito | Padrão 45% da área de conteúdo; mínimo 360 px | Abas de arquivos, diff, browser, artefatos e revisão |
| Painel inferior | Padrão 220 px; mínimo aberto 140 px | Terminal, verificações e logs |
| Barra de estado | 28 px | Modelo, conexão, tarefa e diagnósticos |
| Separadores | 1 px visível; área de arraste 6 px | Cursor e foco próprios; ajustar também por teclado |

O compositor fica ancorado à base da conversa, fora da rolagem de mensagens. Deve crescer até 240 px; depois rolar internamente. Não cobrir a última mensagem, o botão parar ou o teclado móvel.

Painéis podem ser recolhidos, maximizados e restaurados. Persistir dimensões por dispositivo, sem restaurar uma combinação que torne o conteúdo inacessível numa tela menor.

## 3. Tokens — VIS-03

Valores propostos; a implementação deve usá-los por variáveis semânticas, inclusive editor e terminal.

| Token | Escuro | Claro | Uso |
| --- | --- | --- | --- |
| background | #141414 | #FFFFFF | Área principal |
| sidebar | #101010 | #F5F5F4 | Navegação |
| surface | #1C1C1C | #F7F7F6 | Cartões e compositor |
| elevated | #252525 | #FFFFFF | Menus e diálogos |
| hover | #2C2C2C | #ECECE9 | Hover e seleção neutra |
| border | #343434 | #DADAD5 | Separadores e contornos |
| text-primary | #F2F2F2 | #202020 | Conteúdo principal |
| text-secondary | #B0B0B0 | #61615B | Metadados |
| accent | #9DDDC5 | #19624B | Estado ativo e ação de destaque |
| success | #8BDBAA | #206C3C | Resultado positivo |
| warning | #F3CB80 | #805600 | Atenção e pendência |
| error | #F29A9A | #A52A2A | Erro |
| focus | #A8C9FF | #215DB0 | Foco e referência |
| diff-added-bg | #173025 | #E8F5EC | Trechos adicionados |
| diff-removed-bg | #352021 | #FCEBEC | Trechos removidos |

Espaçamento: 4, 8, 12, 16, 20, 24, 32 e 48 px. Raios: 6 px controles compactos, 10 px cartões, 16 px compositor e 999 px chips. Ícones de traço: 16/20 px, mesma família em toda a interface. Espessura: 1,5–2 px. Não usar emoji como ícone funcional principal.

Sombra apenas em menu, popover, diálogo e painel flutuante. Não depender de sombra para separar áreas no tema escuro. Carregar fontes e ícones localmente.

## 4. Tipografia e densidade — VIS-04

- Interface: fonte de sistema com fallback Segoe UI, Inter e sans-serif; não depender de download externo.
- Texto: 14 px/22 px; conversa: 15 px/25 px; metadados: 12 px/18 px.
- Títulos: 20 px/28 px para página e 16 px/24 px para seção; pesos 500–600.
- Código/terminal: fonte monoespaçada local, 13 px/20 px; zoom independente.
- Botões desktop: mínimo 32 px; alvos de toque: mínimo 44 × 44 px.
- Opção de densidade confortável ou compacta. A densidade compacta não reduz alvos no modo toque.
- Números de métricas com largura estável. Não exibir número estimado como medição exata.

## 5. Mapa completo de telas — VIS-05

| Tela | Conteúdo e ações | Estados obrigatórios |
| --- | --- | --- |
| T01 Primeiro uso | Endereço Ollama, teste, diretório de dados e perfil inicial | Detectando, conectado, offline, erro, endereço alternativo |
| T02 Início | Nova conversa, projetos recentes, tarefas e ações salvas | Primeiro uso, dados presentes, busca vazia |
| T03 Conversa | Mensagens, compositor, modelo, modo e execução | Rascunho, streaming, ferramenta ativa, concluída, interrompida, falha |
| T04 Busca global | Filtros por conversa/projeto/arquivo e prévia | Buscando, resultados, nenhum resultado, erro |
| T05 Projeto | Pasta, host, instruções, ações e conversas | Projeto novo, indisponível, sem Git, pronto |
| T06 Arquivos/editor | Árvore, abas, breadcrumbs, fonte e diagnósticos | Carregando, limpo, alterado, binário, conflito, erro de acesso |
| T07 Diff/revisão | Resumo, lista, bases, hunks e comentários | Sem alterações, alterações, conflito, comentário obsoleto |
| T08 Git/worktrees | Branches, commits, checkout e recuperação | Criando, pronto, arquivando, conflito, recuperação falhou |
| T09 Terminal/verificações | Sessões, comandos, saídas e resultados | Rodando, finalizado, falhou, cancelando, desconectado |
| T10 Modelos | Servidores, catálogo, filtros, capacidades e tarefas | Offline, nenhum modelo, download, carregado, incompatível |
| T11 Perfil de modelo | Prompt, parâmetros, teste e métricas | Salvo, alterado, parâmetro não suportado, erro de teste |
| T12 Agentes/objetivos | Papéis, modelo, tarefas, evidências e controles | Na fila, ativo, pausado, precisa de entrada, concluído |
| T13 Automações | Agendas, fuso, condição, disparos e avisos | Ativa, pausada, próximo disparo, falhou, disparo perdido |
| T14 Skills/plugins/MCP | Instalados, catálogo, conteúdo e conexões | Desabilitado, conectando, autorizado, requer login, incompatível |
| T15 Memória/contexto | Memórias, instruções, resumo e trechos recuperados | Vazio, editando, compactando, índice antigo, erro |
| T16 Browser/preview | Abas, URL, navegação, capturas e comentários | Navegando, pronto, bloqueio de incorporação, login, erro |
| T17 Computador | Host, janela, transmissão, entrada e histórico | Pareado, observando, controlando, interrompido, desconectado |
| T18 Voz | Dispositivo, transcrição, áudio e controles | Permissão, ouvindo, processando, falando, interrompido, erro |
| T19 Imagens | Prompt, referência, máscara, parâmetros e versões | Na fila, carregando modelo, gerando, pronta, cancelada, erro |
| T20 Artefatos/documentos | Biblioteca, preview, páginas, versões e exportação | Extraindo, renderizando, pronto, formato não suportado, falha |
| T21 Publicações | Destino, versão, URL e logs | Sem destino, construindo, publicando, publicado, rollback, erro |
| T22 Hosts/ambientes | Local, SSH, pareamento, setup e transferência | Offline, conectando, pronto, sincronizando, conflito |
| T23 Configurações | Geral, aparência, modelos, autonomia, ferramentas, voz, imagem, rede, armazenamento | Salvo, alterado, validação, requer reinício |
| T24 Diagnóstico/backup | Versões, recursos, serviços, migrações e exportação | Saudável, degradado, erro, backup/restore ativo |
| T25 Arquivo e histórico | Conversas arquivadas, snapshots e retenção | Vazio, filtrado, restauração, exclusão |
| T26 Central de notificações | Conclusões, falhas e solicitações de entrada | Não lida, lida, silenciada, sem notificações |

Telas de gerência podem ser páginas ou painéis amplos. O usuário deve conseguir voltar à conversa sem perder estado. Não exigir que todos os recursos avancem simultaneamente em uma única tela.

## 6. Componentes reutilizáveis — VIS-06

| Grupo | Componentes |
| --- | --- |
| Shell | AppShell, TopBar, Sidebar, SectionHeader, ProjectRow, ConversationRow, StatusBar, Splitter, PanelTabs |
| Navegação | CommandPalette, GlobalSearch, Breadcrumb, ContextMenu, DropdownMenu, Tooltip, ShortcutHint |
| Chat | Transcript, UserMessage, AssistantMessage, MessageActions, CodeBlock, Citation, AttachmentChip, Composer |
| Trabalho | RunStatus, ToolCallCard, PlanChecklist, GoalCard, QueuedPrompt, AgentCard, ResourceQueue |
| Código | FileTree, EditorTab, DirtyIndicator, DiffSummary, DiffHunk, ReviewComment, ConflictEditor |
| Execução | TerminalTab, CommandCard, OutputViewer, CheckResult, ProcessRow, LogFilter |
| Gestão | ModelCard, CapabilityBadge, ParameterField, ConnectionCard, ScheduleRow, PluginCard, MemoryEntry |
| Mídia | AudioControls, VoiceState, ImageGallery, MaskOverlay, ArtifactCard, DocumentPager |
| Sistema | Button, IconButton, Input, Select, Toggle, Slider, Dialog, Drawer, Toast, Alert, EmptyState, Skeleton |

Cada componente interativo deve especificar default, hover, active/pressed, focus-visible, disabled e loading. Itens selecionáveis também precisam de selected. Erros terão texto específico e ação de recuperação quando existente.

## 7. Conversa e compositor — VIS-07

Mensagens do usuário com superfície discreta alinhada ao fluxo de leitura; respostas do agente sem grandes balões decorativos. Separar progresso, ações executadas e resposta final. Cartões de ferramenta recolhidos por padrão mostram ação, alvo e estado; expansão revela argumentos, comando e saída.

Não mostrar raciocínio privado inventado. Se o modelo/serviço disponibilizar um campo de raciocínio, sua apresentação será controlável; resumos de progresso devem descrever ações e fatos observáveis.

Compositor: texto multilinha, anexar/arrastar, botão ditar, seletor de modo, modelo e host. Enviar vira parar durante execução. Disponibilizar ações distintas “Adicionar à fila” e “Direcionar tarefa atual”. O rascunho fica preservado após erro de envio.

Enter envia, Shift+Enter quebra linha e composição IME não dispara envio. Permitir inverter esse comportamento nas preferências. Anexos mostram tipo, nome, tamanho e estado; não apenas um ícone genérico.

Rodapé do compositor: conexão, modelo/perfil, autonomia e contexto. Na tela pequena, reduzir a chips ou menu sem ocultar que a tarefa roda com acesso total.

## 8. Estados e feedback — VIS-08

Estados globais: inicializando, pronto, Ollama indisponível, host desconectado, reconectando, recurso ausente, armazenamento cheio e migração necessária.

Estados de execução: fila, carregando modelo, gerando, usando ferramenta, aguardando recurso, aguardando entrada, pausada, cancelando, cancelada, concluída e falhou. Distinguir “modelo carregando” de “gerando” para explicar latência.

Mostrar percentuais apenas quando a fonte disponibilizar progresso real; caso contrário usar estado indeterminado. Ação parar recebe resposta visual imediata, mantendo “cancelando” até confirmação do executor. Erro deve apontar componente real e oferecer testar conexão, tentar novamente, abrir log ou ajustar perfil.

Rolagem: acompanhar resposta apenas se o usuário estiver no fim. Ao ler conteúdo anterior, manter posição e mostrar “Novas mensagens”. Mensagens e saídas longas devem ser virtualizadas, com copiar/exportar completo disponíveis.

## 9. Responsividade — VIS-09

| Largura CSS | Composição |
| --- | --- |
| 1440 px ou mais | Navegação, conversa e painel direito abertos; terminal opcional |
| 1100–1439 px | Navegação compactável; conversa/painel com mínimos respeitados |
| 768–1099 px | Lateral em drawer; chat e ferramenta por abas quando não couberem lado a lado |
| 360–767 px | Uma área por vez; navegação em drawer e ferramentas em tela própria |

Em telas menores que 1100 px, priorizar modo de uma área quando mínimos entrarem em conflito. No celular: topo com projeto/host, conteúdo, compositor e navegação inferior Conversa/Arquivos/Tarefas/Mais. Ao abrir teclado, preservar acesso ao campo e ao enviar/parar.

Editor, terminal e tabelas podem rolar horizontalmente dentro de sua área. A página inteira não deve gerar rolagem horizontal. Diff lado a lado vira unificado por padrão no celular.

Verificação de referência: 1600×1000, 1440×900, 1280×800, 1024×768, 768×1024, 390×844 e 360×800 CSS px. Testar zoom 200% no desktop e orientação móvel.

## 10. Atalhos — VIS-10

| Ação | Padrão proposto |
| --- | --- |
| Paleta | Ctrl+K |
| Nova conversa | Ctrl+Alt+N |
| Buscar conversa/conteúdo | Ctrl+F no contexto da aplicação |
| Abrir arquivo | Ctrl+P quando o editor estiver ativo |
| Buscar no projeto | Ctrl+Shift+F no editor/projeto |
| Salvar arquivo | Ctrl+S no editor |
| Enviar | Enter, configurável |
| Quebra de linha | Shift+Enter, configurável |
| Fechar menu/dialog ou voltar | Escape |
| Interromper tarefa | Escape com execução focada; botão parar sempre disponível |
| Alternar lateral | Ctrl+Alt+B |
| Alternar terminal | Ctrl+Alt+T |

Nenhum atalho deve depender de interceptar combinação reservada pelo navegador/sistema. Todos precisam de ação visível equivalente. No terminal, Ctrl+C pertence ao processo; na área de texto, pertence à cópia. Atalhos configuráveis e descoberta pela paleta.

## 11. Acessibilidade e movimento — VIS-11

Meta de implementação: critérios aplicáveis WCAG 2.2 AA, verificados por análise automatizada e inspeção manual; esta meta não é uma certificação. Contraste de texto normal de pelo menos 4,5:1; componentes e texto grande, quando aplicável, 3:1. Corrigir tokens se a combinação real não atender.

Nomes acessíveis para ícones, semântica de tabs/dialogs/menus, ordem de foco coerente e retorno ao acionador ao fechar diálogo. Erros ligados ao campo. Não depender só de cor em diff, fila ou diagnóstico. Progresso por leitor de tela deve ser resumido, sem anunciar cada token gerado.

Transições de 120–180 ms para menus e recolhimento. Respeitar prefers-reduced-motion. Não usar animações contínuas decorativas, flashes ou efeito de digitação que atrase a leitura.

## 12. Temas, preferência e identidade — VIS-12

Claro, escuro e sistema; persistir escolha e aplicar antes da primeira pintura. Permitir escala de fonte, zoom do código, densidade e layout. Não embutir valores de tema em componentes isolados.

Ícones, favicons, nome e tela de abertura devem ser próprios. Sem banners de assinatura, créditos fictícios ou seleção de modelos não conectados. Dados demonstrativos só existem nas referências de planejamento, identificadas como tal.

## 13. Validação visual — VIS-13

Manter uma galeria de componentes e cenários para T01–T26. Capturar estados principais em temas claro/escuro, nos tamanhos aplicáveis, com relógio e dados determinísticos.

Critérios de aceite:

1. Composição e tokens correspondem à base visual aprovada para a versão.
2. Nenhum texto essencial cortado, controle sobreposto ou conteúdo inacessível.
3. Nomes de projeto/arquivo longos têm truncamento com acesso ao nome completo.
4. Empty, loading, error, disabled, selected e focus-visible existem onde aplicáveis.
5. Editor, terminal, diff e mídia têm tema coerente com o shell.
6. Mudança de tamanho, tema e orientação preserva estado útil.
7. Todas as ações essenciais são alcançáveis por teclado e toque.
8. Nenhum botão de função entregue permanece sem efeito real.

As três referências SVG não substituem a validação das demais telas. Uma fase só encerra depois da validação visual de seus componentes e fluxos.
