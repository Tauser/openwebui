# API implementada

Estado: I02.7, 28/10/2026. Base: `http://127.0.0.1:3001/api/v1`. Os tipos canônicos estão em [contracts](../packages/contracts/src/index.ts). Este documento descreve o código entregue, sem antecipar ferramentas do motor.

Requisições POST/PATCH usam `Content-Type: application/json`. DELETE não exige corpo. O servidor valida Host e origem; respostas de erro de aplicação usam `{ "error": "mensagem" }`. Entradas inválidas retornam 400, referências inexistentes 404 e conflitos de geração/vínculo 409. O acesso LAN ainda não tem autenticação completa.

## Conexão e configurações

| Método e caminho | Comportamento |
| --- | --- |
| GET `/health` | Estado da API, armazenamento e conexão Ollama global |
| GET/PATCH `/settings` | Ler/alterar configurações gerais |
| GET `/models?endpointId=ID` | Catálogo do endpoint; sem ID usa a conexão global |
| GET `/models/recommendations?model=NOME&endpointId=ID` | Parâmetros do modelo e estimativa de hardware; endpoint é opcional |
| GET `/configuration?conversationId=ID` | Configuração efetiva da conversa |
| GET `/configuration?sectionId=ID` | Base efetiva para uma nova conversa no projeto |
| GET `/configuration` | Configuração global efetiva |

Não combinar `conversationId` e `sectionId` na mesma consulta. A configuração efetiva retorna `{ settings, source, profileId?, hasOverrides }`; `source` é `global`, `project` ou `conversation`.

A indicação de contexto usa a capacidade total de RAM/VRAM e o tamanho do modelo. Recomendações não impedem valores manuais acima da estimativa. O contexto manual é enviado integralmente ao provider; falhas reais do Ollama são informadas. O formato aceito continua exigindo temperatura entre 0 e 2 e contexto inteiro entre 128 e 1048576 tokens.

## Servidores e perfis

| Método e caminho | Corpo/resultado |
| --- | --- |
| GET `/endpoints` | `{ endpoints: OllamaEndpoint[] }` |
| POST `/endpoints` | `{ name, url }`; retorna o cadastro criado |
| PATCH `/endpoints/:id` | Nome e/ou URL HTTP(S), sem credenciais |
| DELETE `/endpoints/:id` | `{ removed: true }`; rejeita endpoint referenciado |
| GET `/profiles` | `{ profiles: ModelProfile[] }` |
| POST `/profiles` | Nome e todos os campos de geração; retorna o perfil criado |
| PATCH `/profiles/:id` | Campos parciais; `think: null` restaura o padrão |
| DELETE `/profiles/:id` | `{ removed: true }`; rejeita perfil referenciado |

Campos de geração: `model`, `systemPrompt`, `followModelDefaults`, `temperature`, `numCtx` e `think`. Tema e servidor são independentes do perfil. `think` aceita null, booleano ou valor textual declarado pelo modelo.

Precedência: configurações gerais → perfil do projeto → perfil da conversa → `configOverrides` da conversa. Cada perfil substitui os campos de geração completos; os ajustes locais são parciais. Alterar o perfil compartilhado afeta suas conversas nas próximas gerações. Alterações nas configurações de perfil/projeto/conversa usadas por uma geração ativa são rejeitadas.

## Projetos e conversas

| Método e caminho | Comportamento |
| --- | --- |
| GET `/sections` | `{ sections: SidebarSection[] }`; projetos da barra lateral |
| POST `/sections` | Nome; pasta, repositório, fixação e `profileId` opcionais |
| PATCH `/sections/:id` | Alterar metadados, posição ou perfil |
| POST `/sections/:id/remove` | Corpo `{}`; remove o grupo e preserva suas conversas |
| GET `/conversations` | `{ conversations: Conversation[] }` |
| POST `/conversations` | `title`, `sectionId`, `endpointId`, `profileId`, `configOverrides` opcionais; retorna detalhe |
| GET `/conversations/:id` | `{ conversation, messages }` |
| PATCH `/conversations/:id` | Título, arquivo, fixação, projeto, endpoint, perfil ou ajustes |
| POST `/conversations/:id/fork` | `{ messageId }`; ramifica antes da mensagem de usuário indicada |
| POST `/conversations/:id/messages` | `{ content, model?, attachments? }`; resposta em streaming |
| POST `/conversations/:id/cancel` | Corpo `{}`; retorna `{ cancelled: boolean }` |

No PATCH da conversa, arquivo corresponde ao campo booleano `archived`; fixação corresponde a `pinned`. `endpointId: null` volta à conexão global; `profileId: null` volta ao perfil do projeto/padrão. `configOverrides: null` ou `{}` limpa ajustes. Um objeto não vazio substitui o objeto de ajustes inteiro. Ramificações copiam projeto, endpoint, perfil, ajustes e o histórico anterior ao ponto escolhido.

O streaming usa `application/x-ndjson`, com um evento JSON por linha: `message`, `activity`, `delta`, `done` ou `error`. Cancelar preserva o texto parcial; reinício marca gerações interrompidas como erro. Há uma geração simultânea por instância do servidor.

Anexos suportados: texto/código UTF-8 e PNG/JPEG/WebP, até oito itens, 256 KiB por texto, 4 MiB por imagem preparada e 8 MiB no total. Imagens exigem visão confirmada. O orçamento estimado dos anexos usa o contexto efetivamente configurado e não trunca arquivos silenciosamente. Arquivos não concedem acesso ao sistema de arquivos ou execução de comandos.
