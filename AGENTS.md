# Coordenação do Codex Web Local

## Objetivo

Implementar o produto descrito em PLANEJAMENTO.md e docs/ESCOPO_FUNCIONAL.md. O usuário autorizou equipe de agentes Terra para codificação e o agente principal para gerência, integração e revisão.

## Equipe e divisão

- Gerente/integrador: agente principal. Dono dos contratos compartilhados, configuração raiz, roadmap, integração e aceite.
- Terra Interface: apps/web/**. Dono da experiência visual e interação.
- Terra Plataforma: apps/server/**. Dono da API, SQLite e coordenação das conversas.
- Terra Ollama: packages/providers/**, packages/runtime/** e tools/diagnostics/**. Dono da conexão local, streaming, diagnóstico, prova do motor e testes do adaptador.
- Novas tarefas serão distribuídas pelo gerente após a integração de cada incremento.

## Colaboração

1. Ler docs/ROADMAP.md e docs/EQUIPE_AGENTES.md quando existirem.
2. Trabalhar apenas nos caminhos atribuídos; combinar mudanças de contrato com o gerente.
3. Não sobrescrever alterações de outro agente, não fazer git reset/clean e não criar commits sem instrução.
4. Não instalar dependências em paralelo: o gerente mantém package.json e lockfile da raiz e executa a instalação.
5. Informar dependências necessárias ao gerente. Não introduzir modelos ou serviços pagos automaticamente.
6. Não marcar item aceito sem evidência real. Modelos ou credenciais ausentes devem aparecer como pendência explícita.
7. Sem dados fictícios na interface entregue; estados vazios e offline são funcionais.
8. Não publicar o produto: trabalho local no Windows. Scripts persistentes em background devem iniciar sem janela visível.

## Validação

Typecheck e build do incremento; testes de comportamento para persistência, streaming e cancelamento; validação visual dos fluxos implementados. Não criar testes que apenas repitam a implementação.

## Ambiente

Node 22.22.0 disponível. Usar npm workspaces. SQLite nativo node:sqlite evita build de módulo nativo neste incremento. Inferência pela API Ollama configurável, sem fallback de nuvem. Escopo avançado do executor de comandos fica nas fases posteriores; não expor terminal público no primeiro chat.
