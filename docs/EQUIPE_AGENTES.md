# Equipe de implementação

Data: 27/10/2026. Autorização: pedido do proprietário para agentes Terra codificarem e o agente principal gerenciar.

## Composição ativa

| Papel | Agente da sessão | Modelo | Responsabilidade e caminhos |
| --- | --- | --- | --- |
| Gerente e integrador | /root | Modelo atual desta conversa | Contratos, configuração raiz, roadmap, integração, revisão e aceite |
| Terra Interface | /root/terra_interface | gpt-6.1-terra | apps/web/**; visual, estados, interação e integração da UI |
| Terra Plataforma | /root/terra_plataforma | gpt-6.1-terra | apps/server/**; API, SQLite, coordenação e persistência |
| Terra Ollama | /root/terra_ollama | gpt-6.1-terra | packages/providers/**, packages/runtime/** e tools/diagnostics/**; provider, motor e diagnóstico |

Há três vagas simultâneas de execução além do gerente nesta sessão. Revisão e especialidades posteriores serão novas atribuições desses agentes; não representam uma quantidade ilimitada de processos concorrentes.

Estes agentes usam o modelo Terra no ambiente Codex para construir o produto. As LLMs usadas pelo produto em execução continuam sendo as configuradas no Ollama; são configurações independentes.

## Gestão e integração

1. O gerente define um incremento com IDs e evidência de aceite.
2. Cada agente recebe caminhos exclusivos e contratos compartilhados.
3. Mudanças de contrato são combinadas com o gerente e comunicadas aos demais.
4. Dependências, lockfile e instalação pertencem ao gerente.
5. O agente entrega código, verificações e limitações; o gerente integra e valida comportamento.
6. O roadmap só muda para aceito após a evidência correspondente. Parcialmente implementado continua em validação ou em andamento.
7. Depois da revisão, os agentes recebem a próxima tarefa pelo gerente. Não há publicação ou mensagem a terceiros neste fluxo.

A equipe opera durante as execuções desta conversa. Este arquivo não cria uma automação permanente nem promete trabalho enquanto não houver execução ativa.

## Rotação por fase

| Fase | Interface | Plataforma | Ollama/especialista |
| --- | --- | --- | --- |
| F0–F1 | Shell, chat e temas | Persistência e API | Diagnóstico e provider |
| F2–F3 | Editor, diff e terminal | Workspace, Git e recuperação | Motor, ferramentas e cancelamento |
| F4 | Gestão de extensões/agendas | Plugins, MCP e scheduler | Agentes, recursos e testes de integração |
| F5 | Browser e desktop | Sessões/transporte visual | Runner, automação e replay |
| F6 | Voz, imagens e artefatos | Pipelines e armazenamento | Backends multimodais/documentos |
| F7–F8 | Remoto, operação e acessibilidade | Hosts, deploy, backup e migrações | Conectores, instalação e validação |

Revisão cruzada será atribuída fora dos caminhos modificados quando possível. O gerente mantém a visão completa do escopo e resolve os conflitos de integração.
