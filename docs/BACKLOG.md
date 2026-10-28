# Backlog rastreável

Atualizado em 2026-10-28. Gerado por npm run roadmap:sync; estados editados em docs/progresso.json.

Total: 152 requisitos. Critérios e dependências permanecem no [catálogo funcional](ESCOPO_FUNCIONAL.md).

| ID | Requisito | Fase | Responsável | Estado | Evidência |
| --- | --- | --- | --- | --- | --- |
| CFG-01 | Primeiro uso e diagnóstico | F1 | Terra Ollama / Plataforma | em andamento | I01: diagnóstico e conexão manual; fluxo dedicado de primeiro uso pendente |
| CFG-02 | Múltiplos servidores Ollama | F1 | Terra Ollama / Plataforma | aceito | I02.6: cadastro de endpoints persistentes, escolha por conversa, catálogos por servidor e fork/cancelamento validados. Dois servidores simulados HTTP e catálogo local real; segundo host físico não disponível. docs/ACEITE.md |
| CFG-03 | Lista e capacidades | F1 | Terra Ollama / Plataforma | em andamento | I02 parcial: metadados, thinking, limites e tamanho consultados por modelo; visualização completa de capacidades pendente |
| CFG-04 | Perfis de modelo | F1 | Terra Ollama / Plataforma | aceito | I02.7: CRUD de perfis por conversa/projeto, ajustes locais, herança e fork; build, 35 testes, transporte e UI simulados passaram. Instalação pessoal atualizada após término da geração, backup e hashes idênticos. docs/ACEITE.md |
| CFG-05 | Parâmetros suportados | F1 | Terra Ollama / Plataforma | em andamento | I02 parcial: presets, recomendações automáticas e contexto ajustado por RAM/VRAM/pesos/KV; demais parâmetros pendentes |
| CFG-06 | Prompt e precedência | F1 | Terra Ollama / Plataforma | em andamento | I01: prompt editável; precedência multicamada pendente |
| CFG-07 | Download e remoção | F3 | Terra Ollama / Plataforma | planejado | — |
| CFG-08 | Importação local | F3 | Terra Ollama / Plataforma | planejado | — |
| CFG-09 | Modelfile e variantes | F3 | Terra Ollama / Plataforma | planejado | — |
| CFG-10 | Carga e descarregamento | F3 | Terra Ollama / Plataforma | planejado | — |
| CFG-11 | Benchmark e papéis | F4 | Terra Ollama / Plataforma | planejado | — |
| CFG-12 | Backup de perfis | F3 | Terra Ollama / Plataforma | planejado | — |
| CHAT-01 | Conversa e streaming | F1 | Terra Interface / Plataforma | aceito | docs/ACEITE.md: streaming real, resposta final e persistência em SQLite |
| CHAT-02 | Parar, repetir e editar pedido | F1 | Terra Interface / Plataforma | aceito | I02.2: parar, editar e repetir em ramificações com inferência real, preservando origem; docs/ACEITE.md |
| CHAT-03 | Organização | F1 | Terra Interface / Plataforma | aceito | I02.2: favoritos persistidos e ordenação recente/título; criação, rename/archive/restore já validados |
| CHAT-04 | Seções e projetos | F1 | Terra Interface / Plataforma | em andamento | I02.4: projetos com metadados opcionais pasta/repositório, fixação e menus persistidos. Acesso real a pastas/ferramentas pendente; docs/ACEITE.md |
| CHAT-05 | Busca | F3 | Terra Interface / Plataforma | planejado | — |
| CHAT-06 | Anexos e colagem | F1 | Terra Interface / Plataforma | aceito | I02.5: texto/código UTF-8 e PNG/JPEG/WebP, colagem/arraste, erros por item e inferência real validados; rascunhos de arquivos só nesta aba; PDF/Office pendentes em F6; docs/ACEITE.md |
| CHAT-07 | Menções | F2 | Terra Interface / Plataforma | planejado | — |
| CHAT-08 | Conteúdo formatado | F1 | Terra Interface / Plataforma | em andamento | Markdown/tabelas/código e cópia com fallback LAN validados. Texto colado e blocos md/markdown são exibidos no chat; download da resposta substituído por Ver no chat. Painel de artefatos completo pendente; docs/ACEITE.md |
| CHAT-09 | Fila de prompts | F3 | Terra Interface / Plataforma | planejado | — |
| CHAT-10 | Direcionamento em execução | F3 | Terra Interface / Plataforma | planejado | — |
| CHAT-11 | Conversa lateral | F3 | Terra Interface / Plataforma | planejado | — |
| CHAT-12 | Ramos e transferência | F3 | Terra Interface / Plataforma | planejado | — |
| CHAT-13 | Rascunho e leitura | F1 | Terra Interface / Plataforma | aceito | I02.2: rascunhos separados, última conversa e posição de leitura recuperados no navegador após reload/troca |
| CHAT-14 | Exportar e compartilhar | F7 | Terra Interface / Plataforma | planejado | — |
| CHAT-15 | Notificações e não lidas | F3 | Terra Interface / Plataforma | planejado | — |
| CHAT-16 | Comandos e sugestões | F4 | Terra Interface / Plataforma | planejado | — |
| IDE-01 | Abrir/criar projeto | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-02 | Árvore e operações | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-03 | Busca de arquivos/texto | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-04 | Editor com abas | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-05 | Codificação e linhas | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-06 | Concorrência de edição | F3 | Terra Interface / Plataforma | planejado | — |
| IDE-07 | Diff | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-08 | Patches | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-09 | Checkpoints | F3 | Terra Interface / Plataforma | planejado | — |
| IDE-10 | Layout persistente | F1 | Terra Interface / Plataforma | planejado | — |
| IDE-11 | Previews | F2 | Terra Interface / Plataforma | planejado | — |
| IDE-12 | Diagnósticos | F3 | Terra Interface / Plataforma | planejado | — |
| IDE-13 | Editor externo | F7 | Terra Interface / Plataforma | planejado | — |
| IDE-14 | Instruções do projeto | F2 | Terra Interface / Plataforma | planejado | — |
| EXE-01 | Terminal PowerShell | F2 | Terra Plataforma / Ollama | planejado | — |
| EXE-02 | Múltiplos terminais | F2 | Terra Plataforma / Ollama | planejado | — |
| EXE-03 | Comandos do agente | F2 | Terra Plataforma / Ollama | planejado | — |
| EXE-04 | Processos em segundo plano | F3 | Terra Plataforma / Ollama | planejado | — |
| EXE-05 | Parar árvore de processos | F2 | Terra Plataforma / Ollama | planejado | — |
| EXE-06 | Ações de ambiente | F3 | Terra Plataforma / Ollama | planejado | — |
| EXE-07 | Resultados de verificações | F3 | Terra Plataforma / Ollama | planejado | — |
| EXE-08 | Logs e segredos | F3 | Terra Plataforma / Ollama | planejado | — |
| AGT-01 | Modo chat | F1 | Terra Ollama / Plataforma | aceito | docs/ACEITE.md: chat local sem ferramentas de comandos/escrita |
| AGT-02 | Modo planejamento | F2 | Terra Ollama / Plataforma | planejado | — |
| AGT-03 | Modo execução | F2 | Terra Ollama / Plataforma | planejado | — |
| AGT-04 | Modo revisão | F3 | Terra Ollama / Plataforma | planejado | — |
| AGT-05 | Perfis de autonomia | F2 | Terra Ollama / Plataforma | planejado | — |
| AGT-06 | Acesso total | F2 | Terra Ollama / Plataforma | planejado | — |
| AGT-07 | Inspecionar ferramentas | F2 | Terra Ollama / Plataforma | planejado | — |
| AGT-08 | Ciclo de ferramentas | F2 | Terra Ollama / Plataforma | em andamento | Provas isoladas reais: leitura/alteração/teste, cancelamento cliente e retomada de checkpoint. Workspace, chat e reconciliação de efeitos pendentes ainda por integrar; MOTOR.md |
| AGT-09 | Objetivos persistentes | F4 | Terra Ollama / Plataforma | planejado | — |
| AGT-10 | Falhas e repetição | F3 | Terra Ollama / Plataforma | planejado | — |
| AGT-11 | Orçamento de contexto | F2 | Terra Ollama / Plataforma | planejado | — |
| AGT-12 | Compactação | F3 | Terra Ollama / Plataforma | planejado | — |
| AGT-13 | Memória editável | F3 | Terra Ollama / Plataforma | planejado | — |
| AGT-14 | Busca semântica | F4 | Terra Ollama / Plataforma | planejado | — |
| AGT-15 | Recuperação | F3 | Terra Ollama / Plataforma | planejado | — |
| AGT-16 | Progresso e métricas | F2 | Terra Ollama / Plataforma | planejado | — |
| GIT-01 | Estado e diff Git | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-02 | Stage e commits | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-03 | Branches e histórico | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-04 | Worktree por tarefa | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-05 | Arquivar/recuperar worktree | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-06 | Transferir alterações | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-07 | Resolver conflitos | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-08 | Bases de revisão | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-09 | Comentários por linha | F3 | Terra Plataforma / Interface | planejado | — |
| GIT-10 | Remotos | F7 | Terra Plataforma / Interface | planejado | — |
| GIT-11 | Issues e PR/MR | F7 | Terra Plataforma / Interface | planejado | — |
| GIT-12 | CI e revisão remota | F7 | Terra Plataforma / Interface | planejado | — |
| EXT-01 | Skills locais | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-02 | Gestão de skills | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-03 | Ferramentas próprias | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-04 | MCP stdio | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-05 | MCP HTTP | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-06 | Pacotes de plugin | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-07 | Catálogo | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-08 | Hooks | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-09 | Conexões e credenciais | F4 | Terra Plataforma / Ollama | planejado | — |
| EXT-10 | Comunicação e tarefas | F7 | Terra Plataforma / Ollama | planejado | — |
| EXT-11 | Arquivos e APIs | F7 | Terra Plataforma / Ollama | planejado | — |
| EXT-12 | Compatibilidade | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-01 | Agentes personalizados | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-02 | Delegação | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-03 | Fila de recursos | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-04 | Edição entre agentes | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-05 | Agendas | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-06 | Monitoramento | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-07 | Ações e templates | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-08 | Controles e avisos | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-09 | Disparos perdidos | F4 | Terra Plataforma / Ollama | planejado | — |
| AUT-10 | API/webhook/eventos | F7 | Terra Plataforma / Ollama | planejado | — |
| WEB-01 | Pesquisa substituível | F5 | Terra Interface / Ollama | planejado | — |
| WEB-02 | Leitura e citações | F5 | Terra Interface / Ollama | planejado | — |
| WEB-03 | Navegação automatizada | F5 | Terra Interface / Ollama | planejado | — |
| WEB-04 | Browser no painel | F5 | Terra Interface / Ollama | planejado | — |
| WEB-05 | Perfis e login | F5 | Terra Interface / Ollama | planejado | — |
| WEB-06 | Browser existente | F5 | Terra Interface / Ollama | planejado | — |
| WEB-07 | Preview local | F5 | Terra Interface / Ollama | planejado | — |
| WEB-08 | Comentário visual | F5 | Terra Interface / Ollama | planejado | — |
| WEB-09 | Captura de evidência | F5 | Terra Interface / Ollama | planejado | — |
| WEB-10 | Record/replay | F5 | Terra Interface / Ollama | planejado | — |
| PC-01 | Executor Windows | F5 | Terra Ollama / Plataforma | planejado | — |
| PC-02 | Acompanhamento | F5 | Terra Ollama / Plataforma | planejado | — |
| PC-03 | Aplicativos desktop | F5 | Terra Ollama / Plataforma | planejado | — |
| PC-04 | Histórico do computador | F5 | Terra Ollama / Plataforma | planejado | — |
| MED-01 | Visão no chat | F6 | Terra Ollama / Interface | planejado | — |
| MED-02 | Ditado pt-BR | F6 | Terra Ollama / Interface | planejado | — |
| MED-03 | Transcrição de arquivo | F6 | Terra Ollama / Interface | planejado | — |
| MED-04 | Resposta falada | F6 | Terra Ollama / Interface | planejado | — |
| MED-05 | Conversa por voz | F6 | Terra Ollama / Interface | planejado | — |
| MED-06 | Dispositivos | F6 | Terra Ollama / Interface | planejado | — |
| MED-07 | Geração de imagens | F6 | Terra Ollama / Interface | planejado | — |
| MED-08 | Edição de imagens | F6 | Terra Ollama / Interface | planejado | — |
| MED-09 | Variantes | F6 | Terra Ollama / Interface | planejado | — |
| MED-10 | Fila multimodal | F6 | Terra Ollama / Interface | planejado | — |
| ART-01 | Biblioteca | F3 | Terra Plataforma / Interface | planejado | — |
| ART-02 | HTML/aplicações | F5 | Terra Plataforma / Interface | planejado | — |
| ART-03 | PDF | F6 | Terra Plataforma / Interface | planejado | — |
| ART-04 | DOCX | F6 | Terra Plataforma / Interface | planejado | — |
| ART-05 | XLSX/CSV | F6 | Terra Plataforma / Interface | planejado | — |
| ART-06 | PPTX | F6 | Terra Plataforma / Interface | planejado | — |
| ART-07 | Diagramas/gráficos | F6 | Terra Plataforma / Interface | planejado | — |
| ART-08 | Áudio/vídeo | F6 | Terra Plataforma / Interface | planejado | — |
| ART-09 | Pacote-fonte | F7 | Terra Plataforma / Interface | planejado | — |
| ART-10 | Publicação | F7 | Terra Plataforma / Interface | planejado | — |
| ART-11 | Versões publicadas | F7 | Terra Plataforma / Interface | planejado | — |
| ART-12 | Ferramenta de design | F7 | Terra Plataforma / Interface | planejado | — |
| OPS-01 | Sistema visual | F1 | Gerente / equipe | em andamento | I02.4: shell, mensagens, projetos e compositor conforme capturas fornecidas, medidas verificadas e temas; demais telas pendentes |
| OPS-02 | Responsividade/teclado | F1 | Gerente / equipe | em andamento | I01: 1440x900 e 390x844; auditoria integral de teclado/toque pendente |
| OPS-03 | Região e idioma | F1 | Gerente / equipe | planejado | — |
| OPS-04 | Sessão e origem | F1 | Gerente / equipe | em andamento | Validação de Host local/origem; acesso LAN por pedido explícito; sessão autenticada pendente |
| OPS-05 | Rede | F7 | Gerente / equipe | em andamento | Bind LAN e UI pelo IP verificados na própria máquina; Firewall pendente: elevação UAC cancelada. Script administrativo pronto; autenticação, pareamento e HTTPS pendentes; ADR-007 |
| OPS-06 | PWA | F7 | Gerente / equipe | planejado | — |
| OPS-07 | Hosts/SSH | F7 | Gerente / equipe | planejado | — |
| OPS-08 | Transferir tarefa | F7 | Gerente / equipe | planejado | — |
| OPS-09 | Ambientes reproduzíveis | F7 | Gerente / equipe | planejado | — |
| OPS-10 | API/CLI/editor | F7 | Gerente / equipe | planejado | — |
| OPS-11 | Backup/restauração | F8 | Gerente / equipe | planejado | — |
| OPS-12 | Atualização/migração | F8 | Gerente / equipe | planejado | — |
| OPS-13 | Diagnóstico | F3 | Gerente / equipe | em andamento | I01: diagnóstico de hardware/Ollama; painel operacional pendente |
| OPS-14 | Offline | F8 | Gerente / equipe | planejado | — |
| OPS-15 | Retenção e remoção | F8 | Gerente / equipe | planejado | — |
| OPS-16 | Instalação/manual | F8 | Gerente / equipe | planejado | — |
