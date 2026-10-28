# Referências, paridade e limites

Data-base: 27/10/2026. Distinção entre referências documentais, decisões propostas e validações necessárias.

## 1. Fontes oficiais

| Fonte | Uso no planejamento |
| --- | --- |
| [Recursos do Codex/ChatGPT](https://learn.chatgpt.com/docs/pricing) | Checklist de categorias funcionais |
| [Boas práticas](https://learn.chatgpt.com/docs/learn/best-practices) | Contexto de projeto, revisão, skills e MCP |
| [Browser](https://learn.chatgpt.com/docs/browser) | Navegação e preview compartilhados |
| [Ambientes](https://learn.chatgpt.com/docs/environments/modes) | Pasta local, worktree e ambiente remoto |
| [Trabalho remoto](https://learn.chatgpt.com/blog/mastering-codex-remote-for-engineering) | Conversas laterais, filas, objetivos e revisão móvel |
| [Codex como plataforma](https://developers.openai.com/blog/codex-as-a-platform) | Reaproveitamento do motor |
| [App-server](https://learn.chatgpt.com/docs/app-server) | Contrato do possível adaptador Codex |
| [Ollama + Codex](https://docs.ollama.com/integrations/codex) | Integração local documentada |
| [API Ollama](https://docs.ollama.com/api/introduction) | Inferência local e nuvem |
| [Compatibilidade OpenAI](https://docs.ollama.com/api/openai-compatibility) | Compatibilidade parcial por recurso |
| [Ferramentas](https://docs.ollama.com/capabilities/tool-calling) | Ciclo de chamadas e resultados |
| [Saídas estruturadas](https://docs.ollama.com/capabilities/structured-outputs) | Respostas com schema |
| [Contexto](https://docs.ollama.com/context-length) | Memória e janela de contexto |

As fontes descrevem produtos sujeitos a mudanças. Recursos de uma superfície não foram presumidos disponíveis em todos os adaptadores. O catálogo funcional é uma proposta de requisitos próprios, não uma transcrição das capacidades de uma edição comercial.

## 2. Mapa de cobertura

| Família | Equivalente no projeto | Requisitos |
| --- | --- | --- |
| Aparência | Sistema visual próprio inspirado na experiência de programação | OPS-01/02 e especificação visual |
| Conversas | Histórico local, ramos, lateral, fila e direcionamento | CHAT |
| Programação | Editor, diff, terminal, Git e revisão | IDE/EXE/GIT |
| Agente | Motor substituível, objetivos, memória e compactação | AGT |
| Extensibilidade | Skills, MCP, hooks e pacotes próprios | EXT |
| Trabalho paralelo e recorrente | Agentes, filas, agendas e monitoramento | AUT |
| Navegador/computador | Browser gerenciado, pareamento e executor Windows | WEB/PC |
| Voz/imagens | Ollama mais serviços locais específicos | MED |
| Documentos/criação | Artefatos com renderização e exportação | ART |
| Remoto/operação | Hosts do proprietário, diagnóstico e recuperação | OPS |

## 3. Base visual

Alvo: disposição, densidade, hierarquia e comportamento de painéis comparáveis a um ambiente Codex, com identidade própria e rótulos para Ollama.

Não foi fornecido um conjunto completo de screenshots do Codex. Não há, portanto, declaração de fidelidade pixel a pixel. Os SVGs e tokens da especificação visual são a base concreta desta versão. Comparações posteriores com screenshots precisam ser registradas como revisão dessa base.

Não usar logotipos nem indicadores que levem o proprietário a confundir o sistema com serviço oficial. “Codex Web Local” é um nome de trabalho descritivo.

## 4. Provas pendentes

- Compatibilidade real de app-server + versão Ollama + modelo + ferramentas.
- Confiabilidade de tool calling e execução autônoma por modelo.
- Escalonamento de código, voz, imagens e embeddings na GPU disponível.
- Operação de aplicativos escolhidos pelo executor Windows.
- Renderização de documentos e recálculo de planilhas com os recursos utilizados.
- Autorização e operações de cada conector nas contas do proprietário.

São validações das fases de implementação, não funcionalidades já entregues.
