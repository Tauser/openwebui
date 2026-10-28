# Prova do motor nativo Ollama — F0/I03

Em 27/10/2026, `node tools/diagnostics/probe-runtime.mjs` executou uma prova isolada com `qwen3.5-9b-coder:latest`, Ollama local, `think: false`, contexto 4096 e limite de 180 s. Em 13,137 s, o modelo leu `sum.mjs` e `sum.test.mjs`, alterou ambos, executou o teste fixo e concluiu. O teste Node retornou 1/1 sucesso. Evidência local: `.data/runtime-probe/evidence.json`, `checkpoint.json` e os dois arquivos da fixture.

O executor limita os caminhos aos dois arquivos e valida a estrutura permitida dos arquivos antes de executar exclusivamente `node --test sum.test.mjs`. Esta fixture é uma prova limitada, não um executor geral nem uma garantia de segurança para arquivos arbitrários. Ela recusa sobrescrever uma fixture existente.

Quatro testes com provider simulado verificaram replay de chamadas e resultados, limite de etapas, cancelamento e retomada. Chamadas pendentes são marcadas antes da execução e exigem reconciliação manual, evitando repetições automáticas. O checkpoint é mínimo e não oferece durabilidade transacional; a prova posterior de cancelamento e retomada está descrita abaixo. Não houve prova de app-server do Codex ou comparação de qualidade entre motores. F0/I03 permanece parcial; não se declara F0 concluída.

## Cancelamento e retomada com Ollama local

Em 27/10/2026, `node tools/diagnostics/probe-runtime-resume.mjs` iniciou uma chamada real do provider ao Ollama e acionou AbortController após 250 ms. O motor retornou `cancelled` com erro de aborto; o checkpoint persistido permaneceu na etapa 2, sem ferramenta pendente. A retomada desse checkpoint concluiu na etapa 3; uma segunda avaliação com uma chamada pendente sintética retornou `reconcile` sem executar ferramenta. Tempo total: 1,604 s. Evidências em `.data/runtime-resume-probe/evidence.json` e `checkpoint.json`.

Para esta prova, o checkpoint foi construído removendo a resposta final da execução anterior, depois dos resultados das ferramentas. Ela confirma cancelamento da requisição pelo cliente e retomada desse histórico; não confirma que o servidor encerrou imediatamente o processamento, nem simula queda de processo durante uma escrita. A reconciliação de efeitos pendentes permanece manual e o checkpoint não é transacional. F0/I03 continua sujeito ao aceite integrado.

