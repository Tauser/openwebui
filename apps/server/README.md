# API local e rede confiável

Por padrão o servidor escuta em 127.0.0.1:3001. Defina `HOST=0.0.0.0` ou um endereço privado de uma interface local para acesso pela rede local; `PORT` altera a porta. Hosts aceitos são localhost, o nome da máquina e seus endereços privados locais. Requisições com origem precisam vir da mesma origem, com exceção do servidor de desenvolvimento local na porta 5173; alterações exigem JSON.

Não há autenticação completa neste marco. Use o acesso em rede somente em uma rede confiável. O Ollama continua configurado separadamente, e o aplicativo não expõe execução de comandos.

Os dados ficam em `data/codex-local.sqlite`, relativo ao diretório de trabalho do processo (ao usar `npm start` no workspace, `apps/server/data`), ou no diretório indicado por `CODEX_LOCAL_DATA_DIR`. Mensagens parciais são preservadas; após reinício inesperado, gerações interrompidas são marcadas como erro. Com o build de `apps/web` presente, o servidor disponibiliza a interface e o fallback SPA.

`OLLAMA_URL` define a URL inicial somente quando ainda não existe configuração salva; alterações pela interface persistem e têm precedência. Variáveis de um arquivo `.env` precisam ser carregadas pelo ambiente antes da inicialização.

Na raiz do projeto, `npm.cmd start` já carrega `.env` e usa o banco relativo à raiz. Prefira esse comando para manter uma única localização dos dados. A API inclui servidores Ollama nomeados, perfis por projeto/conversa e ajustes locais com precedência explícita. Consulte a [referência da API implementada](../../docs/API.md) e o [guia de desenvolvimento e atualização](../../docs/DESENVOLVIMENTO.md).
