# Validação da F14-T01

Ambiente isolado `digitaly-features`, sem alterar o piloto público.

- Worker real com Redis, PostgreSQL e S3: geração, lastro, leitura anônima negada, reentrega idempotente e três tentativas de rascunho inválido passaram. Limpeza e guardas de negócio foram exercitadas na suíte local; registros detalhados ficam nos logs ignorados em `.local`.
- Processo do Worker conferido sem importação do ADK e sem chave de IA.
- API: assinatura, vencimento, participação, revogação, separação da credencial, prazo e cancelamento exercitados. Na revisão de 15/11/2026, a suíte completa passou com 512/512; 85 unitários e 73 de integração passaram, assim como lint, TypeScript e build.
- Navegador: 297 testes passaram na rodada anterior. Em 15/11/2026, os dois casos específicos do PDF passaram após atualizar os servidores, incluindo os dois temas, download pelo teclado e captura bloqueada depois de recarregar. A nova rodada completa está em execução.
- Web: 277 testes unitários passaram. Agentes: 112 unitários passaram.
- PDF de demonstração gerado, extraído e renderizado; uma página legível com dados fictícios e R$ 7.751,00.

## Pedido completo com IA real — 15/11/2026

Adicionado `apps/web/e2e/agentes/relatorio-pdf-real.spec.ts` ao projeto `modelo-real`. O cenário envia a solicitação pela interface e espera o arquivo gerado pela fila/Worker reais; não simula modelo, fila ou arquivo. Também confere persistência após recarregar e bloqueio para outra Pessoa.

Na tentativa desta revisão, o provedor retornou HTTP 429 de cota diária (20 chamadas gratuitas por dia). O portal publicou a resposta de falha; nenhum PDF foi gerado. O teste permanece reprovado/bloqueado, não aprovado ou ignorado. A consulta real passou antes da cota esgotar. A regressão de agentes terminou com 58 aprovados e 7 falhas de limite do provedor.

Pendências para fechar a tarefa: aprovar o caso completo com IA quando houver cota e resolver as falhas da regressão descritas abaixo. Os comandos e a ordem recomendada estão em `docs/consultas-e-relatorios-digitaly.md`. Não houve merge, push ou atualização do domínio público.

## Revisão visual e sincronização dos testes

As quatro capturas atualizadas em `capturas/` foram inspecionadas: PDF autorizado e conteúdo bloqueado, nos temas claro e escuro. A Pessoa sem acesso não recebe botão de download. São cenários de interface com arquivo de fixture no armazenamento, não evidência de geração pelo modelo real.

A primeira nova rodada completa terminou com 289 aprovações, uma falha e sete casos dependentes não executados. O registro da falha de navegação a uma citação mostrou que a verificação de viewport consumia 2,8 s antes de começar a conferir um destaque que dura 2 s. O teste passou a observar o destaque e sua presença na viewport enquanto a outra aba envia a Mensagem. O cenário passou três vezes seguidas após o ajuste, sem alterar código de produção.

A repetição com seis processos teve 279 aprovações, 11 falhas e sete casos dependentes não executados, incluindo encerramento de abas (`Target crashed`). A rodada com dois processos é registrada separadamente; não considerar as rodadas anteriores integralmente aprovadas.

A rodada com dois processos terminou com 286 aprovações, quatro falhas e sete casos dependentes não executados. Duas falhas eram seletores globais que encontravam elementos também em páginas antigas ocultas: o teste do PDF e o primeiro teste de citação passaram a consultar a lista de Mensagens da Conversa atual. Depois desses ajustes, os cinco cenários de PDF/citação passaram três vezes cada (15/15). Os sete casos de Canais públicos também passaram separadamente. Lint e TypeScript passaram após os ajustes.

Restam falhas em fluxos existentes: o cancelamento por Escape da confirmação de desconectar um Agente falhou em uma de três repetições isoladas; o contador da aba Tarefas após uma delegação falhou em duas de três. Nessas falhas, a confirmação não retornou ao botão esperado ou o contador não chegou ao valor esperado, respectivamente. As causas de produção ainda não foram demonstradas; não alterar os testes para ignorá-las. Logs: `.local/browser-other-regressions.log` e `.local/browser-review-stable.log`. As correções desta revisão não alteraram componentes de produção. A regressão completa continua sem aprovação.

Resultado da revisão: consulta real e componentes locais de segurança/geração aprovados; liberação da funcionalidade completa permanece pendente dos pontos acima. Não atualizar o status da tarefa ou o roadmap para concluído.

## Atualização de 16/11/2026

A instabilidade ao cancelar a desconexão de um Agente foi corrigida no código de produção e verificada com 20 cenários repetidos, incluindo 60 cancelamentos nos dois temas. O registro está em `docs/funcionalidades/10-conexao-de-agentes/tarefas/07-desconectar-um-agente/correcao-cancelamento.md`. A pendência desse fluxo está resolvida no ambiente isolado. Permanecem separadas a atualização do contador de Tarefas e a validação completa de PDF com IA. O piloto público não foi atualizado.
