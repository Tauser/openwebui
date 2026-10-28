# Codex Web Local

Aplicação web pessoal para conversar com modelos Ollama locais. Desenvolvimento gerenciado pelo agente principal com três agentes GPT-6.1 Terra.

Repositório: [Tauser/openwebui](https://github.com/Tauser/openwebui). Documentação atualizada em **28/10/2026**, com o incremento **I02.7** aceito.

## Estado atual

Disponível: chat com streaming e cancelamento, SQLite, histórico, projetos, favoritos e ordenação, criar/renomear/arquivar/restaurar conversa, rascunhos/leitura recuperáveis e editar/repetir pedidos em novas ramificações. Inclui Markdown no corpo das mensagens, anexos de texto/código e imagem, atividades reais da geração, múltiplos servidores Ollama, perfis por projeto/conversa, ajustes locais e temas claro/escuro/sistema. Projetos iniciam expandidos; configurações usam abas Conexão, Modelo e Aparência. Editor, terminal e agente de programação integrado seguem no roadmap.

Último incremento aceito: **I02.7 — perfis de modelo por conversa e projeto**. Build integrado, 35 testes do servidor, prova de transporte e validação visual passaram. Os testes de perfis usaram provider/Ollama simulados; inferência real de chat e anexos foi comprovada em incrementos anteriores. Veja [evidências e limitações](docs/ACEITE.md). F0/F1 continuam em andamento, e a prova isolada do motor ainda não está ligada ao chat pessoal.

## Anexos

Para anexar, use **+ → Anexar arquivos**, arraste arquivos para o compositor ou cole uma imagem. Suporte atual: texto/código UTF-8 e PNG/JPEG/WebP. Até oito arquivos, 256 KiB por texto, 4 MiB por imagem preparada e 8 MiB no total. Imagens exigem visão confirmada no modelo; o contexto dos anexos é verificado contra a configuração efetiva, sem cortar arquivos silenciosamente. PDF, Office e arquivos compactados ainda não são processados.

Anexos enviados permanecem nas mensagens e em ramificações. Anexos ainda não enviados ficam apenas na memória desta aba e são perdidos ao recarregar; o texto do rascunho continua persistente.

## Iniciar

Pré-requisitos: Node.js 22.13 ou superior, npm e Ollama executando com um modelo instalado.

```powershell
git clone https://github.com/Tauser/openwebui.git
cd openwebui
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Para a instalação existente neste computador:

```powershell
cd D:\Projetos\OpenwebUi
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Abra [http://127.0.0.1:3001](http://127.0.0.1:3001). Em Configurações, escolha um modelo listado pelo seu Ollama e salve. Nenhum modelo é baixado automaticamente e não há fallback para nuvem.

Para desenvolvimento, use `npm.cmd run dev`: API em 3001 e Vite em [http://127.0.0.1:5173](http://127.0.0.1:5173).

O endpoint padrão é `http://127.0.0.1:11434`; pode ser alterado na interface. A geração inicial de um modelo descarregado pode demorar. O botão parar cancela a solicitação ativa e preserva o texto parcial.

Em **Configurações → Conexão → Servidores Ollama**, cadastre outros servidores por nome e URL HTTP(S). O seletor **Servidor da conversa**, no compositor, define a conexão usada pelo chat; modelos e suporte a imagens acompanham essa escolha. A seleção persiste ao reabrir e ramificar. **Padrão das configurações** usa o endereço global, preservando o comportamento dos chats anteriores. Para excluir um servidor usado por conversas, primeiro altere a seleção dessas conversas.

Em **Configurações → Modelo → Perfis de modelo**, salve conjuntos de modelo, instruções, temperatura, contexto e raciocínio. O projeto admite um perfil padrão em **Editar projeto**; o seletor **Perfil da conversa**, no topo, permite substituir essa escolha. **Ajustes da conversa** altera somente o chat atual e **Restaurar herança** remove esses ajustes locais. A prioridade é: ajustes locais → perfil da conversa → perfil do projeto → configurações gerais. Perfis vinculados não podem ser excluídos; editar um perfil compartilhado afeta seus chats. A troca de modelo no compositor cria um ajuste local e preserva o perfil e as configurações gerais. Ramificações conservam perfil e ajustes. Servidor e perfil são escolhas independentes; recomendações continuam orientativas.

Para modelos com raciocínio, o perfil permite manter o padrão, ativar ou desativar `think`. O teste com `qwen3.5-9b-coder:latest` usou raciocínio desativado; a disponibilidade dessa opção depende do modelo.

O perfil inicia com **Seguir recomendações do modelo** ativado. Temperatura e raciocínio seguem os parâmetros declarados no Ollama; o contexto é indicado pelo limite do modelo, pelo tamanho dos pesos, pela capacidade total de RAM/VRAM com reserva e por uma estimativa do cache KV. Todos os controles permanecem editáveis. Alterar um deles desativa o acompanhamento automático e mantém os demais valores exibidos. Valores acima das recomendações mostram avisos e podem ser salvos; o contexto manual é enviado integralmente ao Ollama.

Quando a capacidade total estimada não comporta os pesos e o contexto mínimo, a conversa mostra um aviso e tenta a geração. Hardware remoto ou metadados ausentes são identificados como desconhecidos, com contexto automático conservador; valores manuais são respeitados. Memória livre é exibida somente para acompanhamento; a indicação não garante disponibilidade imediata de recursos nem substitui medições de desempenho. Falhas reais do Ollama continuam sendo exibidas.

## Configuração e dados

Copie `.env.example` para `.env` se precisar personalizar portas/endereço/dados. Os scripts da raiz carregam `.env`. Configurações salvas no banco prevalecem sobre o valor inicial de OLLAMA_URL.

Os scripts da raiz usam `data/codex-local.sqlite`. `CODEX_LOCAL_DATA_DIR` permite escolher outro diretório. Banco, caches, logs e arquivos `.env` não devem ser versionados. Por padrão o servidor aceita apenas acesso local; `HOST=0.0.0.0` permite a rede local. Autenticação completa permanece no roadmap.

### Acesso pela rede local

No `.env`, defina `HOST=0.0.0.0`, mantenha `PORT=3001` e reinicie o servidor. Em outro dispositivo da mesma rede, abra `http://IP-DO-COMPUTADOR:3001`. O endereço do Ollama continua sendo acessado pelo servidor; não é necessário expor sua porta 11434.

Se o Windows bloquear a conexão, execute `tools/enable-lan-firewall.ps1` em PowerShell como administrador. A regra permite somente TCP 3001 para o Node.js, vindo da subrede local, nos perfis Privado/Domínio. A rede Ethernet deste computador foi identificada como privada durante a configuração. Não desativar o firewall nem abrir encaminhamento no roteador para usar a LAN.

O modo atual pressupõe uma rede confiável: dispositivos permitidos na subrede podem acessar as conversas e configurações. Login, pareamento e HTTPS completos continuam pendentes. Hosts e origens externos não são aceitos; o frontend usa a API da mesma origem.

O modo disponível é Chat: ele não executa comandos ou altera projetos. Acesso total será uma configuração do motor de programação quando esse componente for implementado.

## Verificar

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run diagnose
npm.cmd run roadmap:sync
```

Os testes de provider usam servidor HTTP temporário local. O diagnóstico somente lê versões/recursos/modelos, sem gerar resposta. Evidências de inferência real ficam identificadas separadamente.

## Gerência e próximos marcos

- [Roadmap](docs/ROADMAP.md)
- [Equipe e responsabilidades](docs/EQUIPE_AGENTES.md)
- [Backlog dos 152 requisitos](docs/BACKLOG.md)
- [Planejamento completo](PLANEJAMENTO.md)
- [Especificação visual](docs/ESPECIFICACAO_VISUAL.md)
- [Relatório do ambiente](tools/diagnostics/ambiente.md)
- [API implementada](docs/API.md)
- [Desenvolvimento, Git e atualização](docs/DESENVOLVIMENTO.md)

A equipe trabalha nas execuções desta conversa. O repositório não contém uma automação permanente de desenvolvimento.
